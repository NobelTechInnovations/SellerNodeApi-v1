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
import sellerCategoryRoutes from './routes/v1/seller/product/categoryRoutes.js';
import productRoutes from './routes/v1/seller/product/productRoutes.js';
import userRoutes from './routes/v1/seller/user/userRoutes.js';
import orderRoutes from './routes/v1/admin/order/orderRoutes.js';
import sellerOrderRoutes from './routes/v1/seller/order/orderRoutes.js';
import sellerPaymentRoutes from './routes/v1/seller/accounts/paymentRoutes.js';
import sellerReturnRoutes from './routes/v1/seller/accounts/returnRoutes.js';
import sellerDashboardRoutes from './routes/v1/seller/accounts/dashboardRoutes.js';
import sellerSupportRoutes from './routes/v1/seller/support/supportRoutes.js';
import sellerAccountRoutes from './routes/v1/seller/accounts/accountRoutes.js';
const app = express();

// CORS configuration
app.use(cors());
// app.use(cors({
//   origin: "https://agoraseller.vercel.app",
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   credentials: true,
// }));

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
app.use('/v1/admin/order', orderRoutes);

// Seller routes
app.use('/v1/seller/product', productRoutes);
app.use('/v1/seller/user', userRoutes);
app.use('/v1/seller/order', sellerOrderRoutes);
app.use('/v1/seller/category', sellerCategoryRoutes);
app.use('/v1/seller/payment', sellerPaymentRoutes);
app.use('/v1/seller/return', sellerReturnRoutes);
app.use('/v1/seller/dashboard', sellerDashboardRoutes);
app.use('/v1/seller/support', sellerSupportRoutes);
app.use('/v1/seller/accounts', sellerAccountRoutes);

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
