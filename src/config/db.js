const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI;
        if (!mongoURI) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }
        
        console.log('Attempting to connect to MongoDB...');
        const conn = await mongoose.connect(mongoURI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        console.log('Continuing without database connection...');
        // Don't exit the process, just log the error
    }
};

module.exports = connectDB;

