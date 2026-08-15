import express from 'express';
import * as SellerAnalyticsController from '../../../../src/controllers/analytics/sellerAnalyticsController.js';
import auth from '../../../../src/middleware/auth.js';

const router = express.Router();

// GET /v1/seller/analytics/overview?from=&to= — this seller's funnel
// (views/add-to-cart/purchases + revenue), per product.
router.get('/overview', auth, SellerAnalyticsController.getOverview);

// GET /v1/seller/analytics/product/:productId — unscoped-by-seller funnel
// for a single product (useful when a seller checks one listing's
// performance directly from the product edit screen).
router.get('/product/:productId', auth, SellerAnalyticsController.getProductOverview);

// Seller Insights & Analytics dashboard (Phase 4, M6) — all support
// ?period=today|yesterday|7d|30d|90d or explicit ?from=&to=.
router.get('/product-performance', auth, SellerAnalyticsController.getProductPerformance);
router.get('/keyword-insights', auth, SellerAnalyticsController.getKeywordInsights);
router.get('/organic-reach', auth, SellerAnalyticsController.getOrganicReach);
router.get('/sales-intelligence', auth, SellerAnalyticsController.getSalesIntelligence);

export default router;
