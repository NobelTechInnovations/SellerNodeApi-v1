import express from 'express';
import { getReturnStatistics, getProductReturnDetails } from '../../../../src/controllers/returnController.js';
import auth from '../../../../src/middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/v1/seller/accounts/return/statistics
 * @desc    Get return statistics for seller
 * @access  Private (Seller)
 */
router.get('/statistics', auth, getReturnStatistics);

/**
 * @route   GET /api/v1/seller/accounts/return/product/:productId
 * @desc    Get return details for a specific product
 * @access  Private (Seller)
 */
router.get('/product/:productId', auth, getProductReturnDetails);

export default router;
