import mongoose from 'mongoose';
import 'dotenv/config';
// Create a separate connection for customer database
const customerDbURI = process.env.CUSTOMER_DB_URI;

if (!customerDbURI) {
    console.error('CUSTOMER_DB_URI is not defined in environment variables');
    throw new Error('Customer database URI is not defined in environment variables');
}

console.log('Attempting to connect to customer database...');
console.log('Connection URI:', customerDbURI.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@')); // Hide credentials in logs

const customerDbConnection = mongoose.createConnection(customerDbURI);

// Log connection state changes
customerDbConnection.on('connecting', () => {
    console.log('Connecting to customer database...');
});

customerDbConnection.on('connected', () => {
    console.log('Successfully connected to customer database');
    console.log('Database name:', customerDbConnection.name);
    console.log('Connection state:', customerDbConnection.readyState);
    console.log('Host:', customerDbConnection.host);
});

customerDbConnection.on('error', (error) => {
    console.error('Customer DB Connection error:', error);
    console.error('Connection state at error:', customerDbConnection.readyState);
    console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
    });
});

customerDbConnection.on('disconnected', () => {
    console.log('Customer database disconnected');
    console.log('Connection state at disconnect:', customerDbConnection.readyState);
    // No manual reconnect here on purpose — see the note on the health
    // check below. The driver reconnects on its own.
});

// Connection health logging.
//
// This used to call `customerDbConnection.connect()` to "reconnect", but
// Connection objects created by mongoose.createConnection() have no
// .connect() method (that only exists on the mongoose singleton) — so on
// Mongoose 8 every single attempt threw `TypeError:
// customerDbConnection.connect is not a function` and the reconnect never
// actually happened. The recovery path was dead code that only produced
// noise in the logs.
//
// It isn't needed either: the MongoDB driver's topology monitor already
// reconnects transparently, and Mongoose buffers commands issued while a
// connection is briefly down. So this is now purely an observability log.
const checkConnectionHealth = () => {
    if (customerDbConnection.readyState !== 1) {
        console.log('Customer DB connection not currently ready. State:', customerDbConnection.readyState,
            '(driver will reconnect automatically)');
    }
};

// Check connection health every 30 seconds. .unref() so this timer never
// by itself keeps the Node event loop alive — without it, ANY script that
// imports this module (directly or transitively, e.g. via a shop model or
// service) can never exit on its own and hangs forever after finishing its
// work. That is exactly what happened to scripts/seedBehaviorData.js.
setInterval(checkConnectionHealth, 30000).unref();

// Handle process termination
process.on('SIGINT', async () => {
    try {
        console.log('Closing customer database connection...');
        await customerDbConnection.close();
        console.log('Customer database connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error during database disconnection:', err);
        process.exit(1);
    }
});

export default customerDbConnection; 