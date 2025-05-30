import express from 'express';
import categoryController from '../controllers/catelog/categoryController.js';
import productController from '../controllers/catelog/productController.js';
import auth from '../middlewares/authMiddleware.js';
    
const router = express.Router();

// Category Routes
router.get('/listing', categoryController.categoryListing);
router.get('/listing/:gspin/info', productController.productListingInfo);
router.get('/listing/:gspin/images', productController.productListingImages);

router.get('/:categoryId/items', categoryController.categoryItems);
router.get('/:categoryId/item/:itemId/suggestions', categoryController.categoryRecommendedProducts);

export default router; 