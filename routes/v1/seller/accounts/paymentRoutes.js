import express from 'express';
import { 
  getPaymentSummary, 
  getPaymentDetails, 
  getSinglePaymentDetails, 
  calculateSellerPayments, 
  processSellerPayment,
  generateInitialPaymentHistory
} from '../../../../src/controllers/paymentController.js';
import auth from '../../../../src/middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth);

// Get payment summary and trends
router.get('/summary', getPaymentSummary);

// Get detailed payment listing with pagination
router.get('/details', getPaymentDetails);

// Get single payment transaction details
router.get('/details/:paymentId', getSinglePaymentDetails);

// Calculate payments for a seller (triggered by cron job or manually)
router.post('/calculate', calculateSellerPayments);

// Generate initial payment history for past orders (one-time setup)
router.post('/generate-history', generateInitialPaymentHistory);

// Process payment to seller (update status to completed)
router.post('/process', processSellerPayment);

export default router;