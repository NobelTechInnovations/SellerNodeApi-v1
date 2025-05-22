import express from 'express';
import categoryController from '../controllers/catelogController/categoryController.js';
import auth from '../middlewares/authMiddleware.js';

const router = express.Router();

// Category Routes
router.get('/listing', auth, categoryController.categoryListing);

export default router; 