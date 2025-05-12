import express from 'express';
import { createProduct, updateProduct } from '../../../../src/validators/products/product.js';
import { validate } from '../../../../src/middleware/validate.js';
import auth from '../../../../src/middleware/auth.js';
import * as productController from '../../../../src/controllers/products/productController.js';
import { createCategory, updateCategory, getCategory, deleteCategory } from '../../../../src/validators/products/category.js';
import * as categoryController from '../../../../src/controllers/products/categoryController.js';
import multer from 'multer';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Create product
router.post('/', 
  auth, 
  productController.createProduct
);
// Get all products
router.get('/', auth, productController.getAllProducts);
// Get single product
router.get('/:product_id', auth, productController.getProduct);
// Update product
router.put('/:product_id', 
  auth, 
  productController.updateProduct
);
// Delete product
router.delete('/:product_id', auth, productController.deleteProduct);
// Update product status
router.patch('/:product_id/status', auth, productController.updateProductStatus);

export default router;