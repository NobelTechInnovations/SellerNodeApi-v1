import express from 'express';
import paymentController from '../controllers/paymentController.js';
import auth from '../middlewares/authMiddleware.js';

const router = express.Router();
// All cart routes require authentication
router.use(auth);

router.post('/phonepe/initiate', paymentController.initiate);

export default router; 