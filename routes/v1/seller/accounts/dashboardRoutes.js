import express from 'express';
import { getDashboardStats, getDashboardDetails, getSalesReport, getReturnsReport } from '../../../../src/controllers/dashboardController.js';
import auth from '../../../../src/middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Get dashboard statistics
router.get('/', getDashboardStats);

// Get detailed dashboard statistics
router.get('/details', getDashboardDetails);

// Get sales report in Excel format
router.get('/sales-report', getSalesReport);

// Get returns report in Excel format
router.get('/returns-report', getReturnsReport);

export default router;
