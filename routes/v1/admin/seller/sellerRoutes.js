import express from 'express';
import * as SellerController from '../../../../src/controllers/admin/sellerController.js';
import adminAuth from '../../../../src/middleware/adminAuth.js';

const router = express.Router();

// Get all sellers with pagination and filtering
router.get('/', adminAuth, SellerController.getAllSellers);

// Get detailed information about a specific seller
router.get('/:id', adminAuth, SellerController.getSellerDetails);

// Get seller onboarding system index and user flow
router.get('/onboarding/index', adminAuth, SellerController.indexSellerOnboarding);

export default router; 