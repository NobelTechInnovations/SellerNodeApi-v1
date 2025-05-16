import express from 'express';
import { getDashboardStats, getDashboardDetails } from '../../../../src/controllers/dashboardController.js';
import auth from '../../../../src/middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);


// Get dashboard statistics
router.get('/', getDashboardStats);

// Get detailed dashboard statistics
router.get('/details', getDashboardDetails);

export default router;
