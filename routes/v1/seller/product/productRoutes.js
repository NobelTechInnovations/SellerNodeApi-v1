const express = require('express');
const router = express.Router();
const { createProduct, updateProduct } = require('../../../../src/validators/products/product');
const { validate } = require('../../../../src/middleware/validate');
const auth = require('../../../../src/middleware/auth');
const productController = require('../../../../src/controllers/products/productController');
const { createCategory, updateCategory, getCategory, deleteCategory } = require('../../../../src/validators/products/category');
const categoryController = require('../../../../src/controllers/products/categoryController');


// Create product

router.post('/', auth, createProduct, validate, productController.createProduct);
// Get all products
router.get('/', auth, productController.getProducts);
// Get single product
router.get('/:product_id', auth, productController.getProduct);
// Update product
router.put('/:product_id', auth, updateProduct, validate, productController.updateProduct);
// Delete product
router.delete('/:product_id', auth, productController.deleteProduct);
// Update product status
router.patch('/:product_id/status', auth, productController.updateProductStatus);


module.exports = router;