import customerDbConnection from '../config/database.js';
import { AppError } from '../utils/index.js';

class BaseService {
    constructor() {
        // Add common service functionality here
    }

    async handleDBOperation(operation) {
        try {
            // This used to try `customerDbConnection.connect()` whenever
            // readyState !== 1, and throw a 503 when that failed. But
            // Connection objects from mongoose.createConnection() have no
            // .connect() method on Mongoose 8 — it always threw TypeError,
            // so the catch always ran. Net effect: during even a momentary
            // driver reconnect, EVERY customer operation (cart, orders,
            // auth, wishlist) hard-failed with "Database connection
            // unavailable" instead of recovering.
            //
            // Mongoose already buffers commands issued while a connection
            // is briefly down and flushes them once the driver reconnects,
            // so the right move is to just run the operation. If the
            // connection really is gone, the buffer times out and surfaces
            // a genuine driver error below rather than a misleading one.
            if (customerDbConnection.readyState !== 1) {
                console.log('Customer DB not ready (state:', customerDbConnection.readyState,
                    ') — relying on driver reconnect + command buffering.');
            }

            return await operation();
        } catch (error) {
            console.error('Database operation failed:', error);
            
            // Handle specific MongoDB errors
            if (error.name === 'MongoError' || error.name === 'MongoServerError') {
                if (error.code === 121) {
                    throw new AppError('Document validation failed', 400);
                } else if (error.code === 11000) {
                    throw new AppError('Duplicate key error', 409);
                }
            }

            // If it's already an AppError, rethrow it
            if (error instanceof AppError) {
                throw error;
            }

            // For other errors, throw a generic database error
            throw new AppError('Database operation failed', 500);
        }
    }
}

export default BaseService; 