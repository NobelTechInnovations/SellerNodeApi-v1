import customerDbConnection from '../config/database.js';
import { AppError } from '../utils/index.js';

class BaseService {
    constructor() {
        // Add common service functionality here
    }

    async handleDBOperation(operation) {
        try {
            // Check connection state before operation
            if (customerDbConnection.readyState !== 1) {
                console.log('Database connection not ready. Current state:', customerDbConnection.readyState);
                try {
                    await customerDbConnection.connect();
                } catch (error) {
                    console.error('Failed to reconnect to database:', error);
                    throw new AppError('Database connection unavailable', 503);
                }
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