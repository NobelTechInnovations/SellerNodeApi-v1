import express from 'express';
import { validate } from '../../../../src/middleware/validate.js';
import adminAuth from '../../../../src/middleware/adminAuth.js';
import { upload, handleUploadError } from '../../../../src/middleware/upload.js';
import { createCategory, updateCategory, getCategory, deleteCategory } from '../../../../src/validators/products/category.js';
import * as categoryController from '../../../../src/controllers/products/categoryController.js';

const router = express.Router();

//Category Routes
router.post('/add', 
    adminAuth,
    (req, res, next) => {
        req.uploadType = 'category';
        next();
    },
    upload.fields([
        { name: 'thumb', maxCount: 1 },
        { name: 'gallery_images', maxCount: 5 }
    ]),
    handleUploadError,
    createCategory, 
    validate, 
    categoryController.createCategory
);

router.get('/', adminAuth, categoryController.getCategories);
router.get('/:category_id', adminAuth, getCategory, validate, categoryController.getCategory);
router.get('/:parent_id/subcategories', adminAuth, categoryController.getSubCategories);
router.put('/:category_id', adminAuth, updateCategory, validate, categoryController.updateCategory);
router.delete('/:category_id', adminAuth, deleteCategory, validate, categoryController.deleteCategory);

export default router;
