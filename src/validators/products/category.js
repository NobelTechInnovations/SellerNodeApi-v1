import { body, param } from 'express-validator';
import mongoose from 'mongoose';
import Category from '../../models/products/category.js';

export const createCategory = [
    body('name')
        .notEmpty()
        .withMessage('Category name is required')
        .isString()
        .withMessage('Category name must be a string')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Category name must be between 2 and 100 characters')
        .custom(async (value, { req }) => {
            // Generate slug from name
            const slug = value.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            
            // Add slug to request body
            req.body.slug = slug;
            return true;
        }),

    body('thumbnail')
        .optional()
        .isString()
        .withMessage('Thumbnail must be a string')
        .trim(),

    body('image_gallery')
        .optional()
        .isArray()
        .withMessage('Image gallery must be an array')
        .custom((value) => {
            if (!Array.isArray(value)) return true;
            return value.every(item => typeof item === 'string');
        })
        .withMessage('All gallery items must be strings'),

    body('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('Status must be either active or inactive'),

    body('parent')
        .optional({ nullable: true })
        .custom(async (value) => {
            if (value === null || value === undefined || value === '') {
                return true;
            }
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('Invalid parent category ID format');
            }
            const parentCategory = await Category.findById(value);
            if (!parentCategory) {
                throw new Error('Parent category not found');
            }
            return true;
        }),

    body('ancestors')
        .optional()
        .isArray()
        .withMessage('Ancestors must be an array')
        .custom(async (value) => {
            if (!Array.isArray(value)) return true;
            for (const ancestorId of value) {
                if (!mongoose.Types.ObjectId.isValid(ancestorId)) {
                    throw new Error('Invalid ancestor category ID format');
                }
                const ancestor = await Category.findById(ancestorId);
                if (!ancestor) {
                    throw new Error('Ancestor category not found');
                }
            }
            return true;
        })
];

export const updateCategory = [
    param('category_id')
        .isMongoId()
        .withMessage('Invalid category ID')
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

    body('name')
        .optional()
        .isString()
        .withMessage('Category name must be a string')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Category name must be between 2 and 100 characters'),

    body('thumbnail')
        .optional()
        .isString()
        .withMessage('Thumbnail must be a string')
        .trim(),

    body('image_gallery')
        .optional()
        .isArray()
        .withMessage('Image gallery must be an array')
        .custom((value) => {
            if (!Array.isArray(value)) return true;
            return value.every(item => typeof item === 'string');
        })
        .withMessage('All gallery items must be strings'),

    body('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('Status must be either active or inactive'),

    body('parent')
        .optional()
        .isMongoId()
        .withMessage('Invalid parent category ID')
        .custom(async (value, { req }) => {
            if (!value) return true;
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('Invalid parent category ID format');
            }
            if (value === req.params.category_id) {
                throw new Error('Category cannot be its own parent');
            }
            const parentCategory = await Category.findById(value);
            if (!parentCategory) {
                throw new Error('Parent category not found');
            }
            return true;
        }),

    body('ancestors')
        .optional()
        .isArray()
        .withMessage('Ancestors must be an array')
        .custom(async (value, { req }) => {
            if (!Array.isArray(value)) return true;
            if (value.includes(req.params.category_id)) {
                throw new Error('Category cannot be its own ancestor');
            }
            for (const ancestorId of value) {
                if (!mongoose.Types.ObjectId.isValid(ancestorId)) {
                    throw new Error('Invalid ancestor category ID format');
                }
                const ancestor = await Category.findById(ancestorId);
                if (!ancestor) {
                    throw new Error('Ancestor category not found');
                }
            }
            return true;
        })
];

export const getCategory = [
    param('category_id')
        .isMongoId()
        .withMessage('Invalid category ID')
        .custom(async (value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('Invalid category ID format');
            }
            const category = await Category.findById(value);
            if (!category) {
                throw new Error('Category not found');
            }
            return true;
        })
];

export const deleteCategory = [
    param('category_id')
        .isMongoId()
        .withMessage('Invalid category ID')
        .custom(async (value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('Invalid category ID format');
            }
            const category = await Category.findById(value);
            if (!category) {
                throw new Error('Category not found');
            }
            // Check if category has any children
            const hasChildren = await Category.exists({ parent: value });
            if (hasChildren) {
                throw new Error('Cannot delete category with subcategories');
            }
            return true;
        })
]; 