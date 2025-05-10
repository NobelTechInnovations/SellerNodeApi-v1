import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import multer from 'multer';
import logger from './src/middleware/logger.js';
import errorHandler from './src/middleware/errorHandler.js';
import connectDB from './src/config/db.js';

// Import routes
import attributeRoutes from './routes/v1/admin/attribute/attributeRoutes.js';
import attributeOptionRoutes from './routes/v1/admin/attributeOption/attributeOptionRoutes.js';
import authRoutes from './routes/v1/admin/auth/authRoutes.js';
import categoryRoutes from './routes/v1/admin/category/categoryRoutes.js';
import productRoutes from './routes/v1/seller/product/productRoutes.js';
import userRoutes from './routes/v1/seller/user/userRoutes.js';

const app = express();

// CORS configuration
app.use(cors());

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logger);

// Make multer upload available globally
app.locals.upload = upload;

// Connect to MongoDB
connectDB();

// Mount routes
// Admin routes
app.use('/v1/admin/attribute', attributeRoutes);
app.use('/v1/admin/attribute-option', attributeOptionRoutes);
app.use('/v1/admin/auth', authRoutes);
app.use('/v1/admin/category', categoryRoutes);

// Seller routes
app.use('/v1/seller/product', productRoutes);
app.use('/v1/seller/user', userRoutes);

app.get('/v1/test', (req, res) => {
    res.status(200).json({ status: 'success', message: 'API is running properly!' });
  });
  
  // Base route
  app.get('/', (req, res) => {
    res.send('Welcome to the Dynamic API');
  });

// Error handling middleware
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
