import express from 'express';
import { validate } from '../../../../src/middleware/validate.js';
import auth from '../../../../src/middleware/auth.js';
import adminAuth from '../../../../src/middleware/adminAuth.js';
import { createCategory, updateCategory, getCategory, deleteCategory } from '../../../../src/validators/products/category.js';
import * as categoryController from '../../../../src/controllers/products/categoryController.js';

const router = express.Router();

//Category Routes
router.post('/', auth, adminAuth, createCategory, validate, categoryController.createCategory);
router.get('/', auth, adminAuth, categoryController.getCategories);
router.get('/:category_id', auth, adminAuth, getCategory, validate, categoryController.getCategory);
router.get('/:parent_id/subcategories', auth, adminAuth, categoryController.getSubCategories);
router.put('/:category_id', auth, adminAuth, updateCategory, validate, categoryController.updateCategory);
router.delete('/:category_id', auth, adminAuth, deleteCategory, validate, categoryController.deleteCategory);

export default router;
