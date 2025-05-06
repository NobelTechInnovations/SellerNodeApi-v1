const express = require('express');
const router = express.Router();
const { validate } = require('../../../../src/middleware/validate');
const auth = require('../../../../src/middleware/auth');
const { createCategory, updateCategory, getCategory, deleteCategory } = require('../../../../src/validators/products/category');
const categoryController = require('../../../../src/controllers/products/categoryController');

//Category Routes
router.post('/', auth, createCategory, validate, categoryController.createCategory);
router.get('/', auth, categoryController.getCategories);
router.get('/:category_id', auth, getCategory, validate, categoryController.getCategory);
router.get('/:parent_id/subcategories', auth, categoryController.getSubCategories);
router.put('/:category_id', auth, updateCategory, validate, categoryController.updateCategory);
router.delete('/:category_id', auth, deleteCategory, validate, categoryController.deleteCategory);

module.exports = router;
