import express from 'express';
import categoryController from '../controllers/catelog/categoryController.js';
import productController from '../controllers/catelog/productController.js';
import auth from '../middlewares/authMiddleware.js';
import optionalAuth from '../middlewares/optionalAuthMiddleware.js';

const router = express.Router();

// Category Routes
router.get('/listing', categoryController.categoryListing);
router.get('/listing/:gspin/info', productController.productListingInfo);
router.get('/listing/:gspin/images', productController.productListingImages);

// Unscoped, location/price/brand-filterable listing — must be registered
// before the `:categoryId/items` param route so `/nearby` isn't swallowed
// by it.
router.get('/nearby', categoryController.nearbyProducts);

// Backend-owned tracked search (Phase 4, M4) — also before `:categoryId/items`
// so `/search` isn't swallowed by the param route. optionalAuth so a
// logged-in search attributes to customer_id, not just anon_id.
router.get('/search', optionalAuth, categoryController.searchProducts);

router.get('/:categoryId/items', categoryController.categoryItems);
router.get('/:categoryId/item/:itemId/suggestions', categoryController.categoryRecommendedProducts);

export default router; 