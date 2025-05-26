import express from 'express';
import { validate } from '../../../../src/middleware/validate.js';
import adminAuth from '../../../../src/middleware/adminAuth.js';
import { upload, handleUploadError } from '../../../../src/middleware/upload.js';
import { createCategory, updateCategory, getCategory, deleteCategory } from '../../../../src/validators/products/category.js';
import * as categoryController from '../../../../src/controllers/admin/categoryController.js';
import * as attributeController from '../../../../src/controllers/products/attributeController.js';
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


router.get('/list', adminAuth, categoryController.getCategories);
router.get('/:category_id', adminAuth, getCategory, validate, categoryController.getCategory);
router.get('/:parent_id/subcategories', adminAuth, categoryController.getSubCategories);
router.post('/:category_id/update', 
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
    updateCategory, 
    validate, 
    categoryController.updateCategory
);
router.delete('/:category_id/delete', adminAuth, deleteCategory, validate, categoryController.deleteCategory);
router.post('/:category_id/map-attributes', adminAuth, categoryController.mapAttributes);
router.get('/:category_id/attributes', adminAuth, categoryController.getMappedAttributes);



export default router;
