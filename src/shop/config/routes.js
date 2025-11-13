import express from 'express';
import customerAuthController from '../controllers/customerAuthController.js';
import { requestOtpValidator, verifyOtpValidator } from '../validators/customerAuthValidator.js';
import auth from '../middlewares/authMiddleware.js';
import catalogRoutes from '../routes/catalogRoutes.js';
import cartRoutes from '../routes/cartRoutes.js';
import paymentRoutes from '../routes/paymentRoutes.js'
import themeRoutes from '../routes/themeRoutes.js'

const router = express.Router();

// Debug middleware to log requests
router.use((req, res, next) => {
    console.log(`[Mobile Route] ${req.method} ${req.originalUrl}`);
    next();
});

// Customer Authentication Routes
router.post('/auth/request-otp', requestOtpValidator, customerAuthController.requestOTP);
router.post('/auth/verify-otp', verifyOtpValidator, customerAuthController.verifyOTP);
router.get('/auth/profile', auth, customerAuthController.getAuthProfile);

router.put('/auth/update-profile', auth, customerAuthController.updateProfile);
router.post('/auth/add-bank', auth, customerAuthController.customerBankAdd);
router.post('/auth/add-payment-method', auth, customerAuthController.customerPaymentMethodAdd);
router.post('/auth/add-address', auth, customerAuthController.customerAddressAdd);

// Cart Routes
router.use('/cart', cartRoutes);
router.use('/payments',paymentRoutes)

//mobile theme routes
router.use('/theme',themeRoutes)

// Catalog Routes
router.use('/gz/catalog', catalogRoutes);

export default router; 