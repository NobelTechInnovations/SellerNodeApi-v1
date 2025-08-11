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
    
    // Attempt to reconnect
    setTimeout(async () => {
        console.log('Attempting to reconnect to customer database...');
        try {
            await customerDbConnection.connect();
        } catch (err) {
            console.error('Reconnection attempt failed:', err);
        }
    }, 5000);
});

// Add a function to check connection health
const checkConnectionHealth = async () => {
    try {
        if (customerDbConnection.readyState !== 1) {
            console.log('Connection is not healthy. Current state:', customerDbConnection.readyState);
            console.log('Attempting to reconnect...');
            await customerDbConnection.connect();
        } else {
            // console.log('Connection is healthy. State:', customerDbConnection.readyState);
        }
    } catch (error) {
        console.error('Health check failed:', error);
    }
};

// Check connection health every 30 seconds
setInterval(checkConnectionHealth, 30000);

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