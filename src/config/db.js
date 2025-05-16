import mongoose from 'mongoose';
import 'dotenv/config';

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI;
        if (!mongoURI) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }
        
        console.log('Attempting to connect to MongoDB...');
        
        // Adding connection options to improve reliability
        const options = {
            connectTimeoutMS: 30000, // 30 seconds
            socketTimeoutMS: 45000, // 45 seconds
            serverSelectionTimeoutMS: 30000, // 30 seconds
            maxPoolSize: 10, // Maximum number of connections in the pool
            minPoolSize: 1,
            retryWrites: true,
            retryReads: true
        };
        
        const conn = await mongoose.connect(mongoURI, options);
        
        // Add connection event listeners
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected, attempting to reconnect...');
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        console.error('Error details:', error);
        console.log('Continuing without database connection...');
        // Don't exit the process, just log the error
    }
};

export default connectDB;

