import express from 'express';
import categoryController from '../controllers/catelog/categoryController.js';
import auth from '../middlewares/authMiddleware.js';
    
const router = express.Router();

// Category Routes
router.get('/listing', categoryController.categoryListing);

router.get('/:categoryId/items', categoryController.categoryItems);

export default router; 