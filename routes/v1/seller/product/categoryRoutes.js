import express from 'express';
import * as categoryController from '../../../../src/controllers/products/categoryController.js';
import auth from '../../../../src/middleware/auth.js';

const router = express.Router();

router.get('/', auth, categoryController.getCategories);
// router.get('/:category_id/attributes', auth, categoryController.getMappedAttributes);

//get sub categories
router.get('/:category_id/tree', auth, categoryController.getSubCategories);
router.get('/:category_id/parent', auth, categoryController.getParentCategory);
export default router;