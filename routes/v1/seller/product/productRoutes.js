import express from 'express';
import { createProduct, updateProduct } from '../../../../src/validators/products/product.js';
import { validate } from '../../../../src/middleware/validate.js';
import auth from '../../../../src/middleware/auth.js';
import * as productController from '../../../../src/controllers/products/productController.js';
import { createCategory, updateCategory, getCategory, deleteCategory } from '../../../../src/validators/products/category.js';
import * as categoryController from '../../../../src/controllers/products/categoryController.js';

const router = express.Router();

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

export default router;