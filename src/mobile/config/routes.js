import express from 'express';
import customerAuthController from '../controllers/customerAuthController.js';
import { requestOtpValidator, verifyOtpValidator } from '../validators/customerAuthValidator.js';
import customerDbConnection from './database.js';

const router = express.Router();

// Debug middleware to log requests
router.use((req, res, next) => {
    console.log(`[Mobile Route] ${req.method} ${req.originalUrl}`);
    next();
});

// Customer Authentication Routes
router.post('/auth/request-otp', requestOtpValidator, customerAuthController.requestOTP);
router.post('/auth/verify-otp', verifyOtpValidator, customerAuthController.verifyOTP);

export default router; 