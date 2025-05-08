import express from 'express';
import { validate } from '../../../../src/middleware/validate.js';
import auth from '../../../../src/middleware/auth.js';
import { createCategory, updateCategory, getCategory, deleteCategory } from '../../../../src/validators/products/category.js';
import * as categoryController from '../../../../src/controllers/products/categoryController.js';

const router = express.Router();

//Category Routes
router.post('/', auth, createCategory, validate, categoryController.createCategory);
router.get('/', auth, categoryController.getCategories);
router.get('/:category_id', auth, getCategory, validate, categoryController.getCategory);
router.get('/:parent_id/subcategories', auth, categoryController.getSubCategories);
router.put('/:category_id', auth, updateCategory, validate, categoryController.updateCategory);
router.delete('/:category_id', auth, deleteCategory, validate, categoryController.deleteCategory);

export default router;
