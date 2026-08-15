import express from 'express';
import customerAuthController from '../controllers/customerAuthController.js';
import { requestOtpValidator, verifyOtpValidator } from '../validators/customerAuthValidator.js';
import auth from '../middlewares/authMiddleware.js';
import catalogRoutes from '../routes/catalogRoutes.js';
import cartRoutes from '../routes/cartRoutes.js';
import paymentRoutes from '../routes/paymentRoutes.js'
import themeRoutes from '../routes/themeRoutes.js'
import locationRoutes from '../routes/locationRoutes.js'
import orderRoutes from '../routes/orderRoutes.js'
import eventRoutes from '../routes/eventRoutes.js'
import homeFeedRoutes from '../routes/homeFeedRoutes.js'
import recommendationRoutes from '../routes/recommendationRoutes.js'
import wishlistRoutes from '../routes/wishlistRoutes.js'

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

// Location Routes (unauthenticated geocode helper for the location gate)
router.use('/gz/location', locationRoutes);

// Customer's own order history
router.use('/orders', orderRoutes);

// Behavior tracking (view/search events) — powers home-feed personalization
router.use('/gz/events', eventRoutes);

// Dynamic/personalized home page feed
router.use('/gz/home-feed', homeFeedRoutes);

// Context-aware recommendations (home/category/pdp/cart/search placements)
router.use('/gz/recommendations', recommendationRoutes);

// Wishlist (M9) — per-customer, auth-gated
router.use('/gz/wishlist', wishlistRoutes);

export default router;