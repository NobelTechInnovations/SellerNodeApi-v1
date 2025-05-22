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
const customerDbURI = process.env.CUSTOMER_DB_URI || process.env.MONGO_URI?.replace('seller_db', 'customer_db') || 'mongodb://localhost:27017/customer_db';

const customerDbConnection = mongoose.createConnection(customerDbURI, options);

customerDbConnection.on('connected', () => {
    console.log('Connected to customer database:', customerDbConnection.name);
    console.log('Customer DB Host:', customerDbConnection.host);
});

customerDbConnection.on('error', (err) => {
    console.error('Customer database connection error:', err);
});

customerDbConnection.on('disconnected', () => {
    console.log('Customer database disconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
    await customerDbConnection.close();
    process.exit(0);
});

export default customerDbConnection; 