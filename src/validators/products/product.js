import { body } from 'express-validator';
import mongoose from 'mongoose';
import Category from '../../models/products/category.js';

export const createProduct = [
    body('product.brand')
        .optional()
        .trim(),

    body('product.status')
        .optional()
        .isIn(['draft', 'published', 'archived', 'varification_pending', 'varification_failed'])
        .withMessage('Invalid status'),

    body('product.slug')
        .optional()
        .trim()
        .isLength({ min: 3 })
        .withMessage('Slug must be at least 3 characters'),

    body('product.type')
        .optional()
        .trim(),

    body('product.category_id')
        .notEmpty()
        .withMessage('Category ID is required')
        .isMongoId()
        .withMessage('Invalid category ID format')
        .custom(async (value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('Invalid category ID format');
            }
            const category = await Category.findById(value);
            if (!category) {
                throw new Error('Category not found');
            }
            return true;
        }),

    body('product.condition')
        .notEmpty()
        .withMessage('Product condition is required')
        .isIn(['new', 'used', 'refurbished'])
        .withMessage('Invalid product condition')
];

export const updateProduct = [
    body('product.unified_sku')
        .optional()
        .notEmpty()
        .withMessage('Unified SKU cannot be empty')
        .trim()
        .isLength({ min: 3 })
        .withMessage('Unified SKU must be at least 3 characters long')
        .matches(/^[A-Za-z0-9-_]+$/)
        .withMessage('Unified SKU can only contain letters, numbers, hyphens, and underscores'),

    body('product.brand')
        .optional()
        .trim(),

    body('product.status')
        .optional()
        .isIn(['draft', 'published', 'archived', 'varification_pending', 'varification_failed'])
        .withMessage('Invalid status'),

    body('product.slug')
        .optional()
        .trim()
        .isLength({ min: 3 })
        .withMessage('Slug must be at least 3 characters'),

    body('product.type')
        .optional()
        .trim(),

    body('product.category_id')
        .optional()
        .isMongoId()
        .withMessage('Invalid category ID format')
        .custom(async (value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('Invalid category ID format');
            }
            const category = await Category.findById(value);
            if (!category) {
                throw new Error('Category not found');
            }
            return true;
        }),

    body('product.condition')
        .optional()
        .isIn(['new', 'used', 'refurbished'])
        .withMessage('Invalid product condition')
]; 