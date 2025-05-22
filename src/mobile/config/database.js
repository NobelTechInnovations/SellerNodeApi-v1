import mongoose from 'mongoose';
import 'dotenv/config';

const options = {
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 30000,
    maxPoolSize: 10,
    minPoolSize: 1,
    retryWrites: true,
    retryReads: true
};

// Create a separate connection for customer database
const customerDbURI = process.env.CUSTOMER_DB_URI;
// const customerDbURI = process.env.CUSTOMER_DB_URI || process.env.MONGO_URI?.replace('seller_db', 'eshop_db');

if (!customerDbURI) {
    throw new Error('Customer database URI is not defined in environment variables');
}

const customerDbConnection = mongoose.createConnection(customerDbURI, options);

// Handle initial connection errors
customerDbConnection.on('error', (error) => {
    console.error('Customer DB Connection error:', error);
    process.exit(1);
});

customerDbConnection.on('connected', () => {
    console.log('Connected to customer database:', customerDbConnection.name);
    console.log('Customer DB Host:', customerDbConnection.host);
});

customerDbConnection.on('disconnected', () => {
    console.log('Customer database disconnected');
});

// Handle errors after initial connection
customerDbConnection.on('error', (error) => {
    console.error('Customer DB error after initial connection:', error);
});

process.on('SIGINT', async () => {
    await customerDbConnection.close();
    process.exit(0);
});

export default customerDbConnection; 