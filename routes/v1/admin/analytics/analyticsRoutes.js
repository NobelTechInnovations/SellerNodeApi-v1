import express from 'express';
import * as AdminAnalyticsController from '../../../../src/controllers/admin/adminAnalyticsController.js';
import adminAuth from '../../../../src/middleware/adminAuth.js';

const router = express.Router();

// All admin-only (adminAuth), platform-wide — never scoped to one seller.
router.get('/overview', adminAuth, AdminAnalyticsController.getOverview);
router.get('/user-journey', adminAuth, AdminAnalyticsController.getUserJourney);
router.get('/product-behavior', adminAuth, AdminAnalyticsController.getProductBehavior);
router.get('/search-behavior', adminAuth, AdminAnalyticsController.getSearchBehavior);
router.get('/recommendation-performance', adminAuth, AdminAnalyticsController.getRecommendationPerformance);

export default router;
