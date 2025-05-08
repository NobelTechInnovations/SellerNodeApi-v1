import Category from '../../models/products/category.js';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

// Create category
export const createCategory = async (req, res) => {
    try {
        // Check if slug already exists
        const existingCategory = await Category.findOne({ slug: req.body.slug });
        if (existingCategory) {
            return sendError(res, 'Category creation failed', 'A category with this name already exists', 400);
        }

        // Handle thumbnail upload
        if (req.files && req.files.thumb && req.files.thumb[0]) {
            req.body.thumbnail = req.files.thumb[0].location; // S3 URL
        }

        // Handle gallery images upload
        if (req.files && req.files.gallery_images) {
            req.body.image_gallery = req.files.gallery_images.map(file => file.location); // Array of S3 URLs
        }

        const category = await Category.create(req.body);
        return sendSuccess(res, 'Category created successfully', { 
            category,
        });
    } catch (err) {
        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(error => error.message);
            return sendError(res, 'Validation failed', errors.join(', '), 400);
        }
        
        // Handle duplicate key error (for slug)
        if (err.code === 11000) {
            return sendError(res, 'Category creation failed', 'A category with this name already exists', 400);
        }

        // Handle other errors
        return sendError(res, 'Failed to create category', err.message, 400);
    }
};

// Get all categories
export const getCategories = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const query = {};

        if (status) query.status = status;

        const categories = await Category.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Category.countDocuments(query);

        return sendSuccess(res, 'Categories retrieved successfully', {
            categories,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        return sendError(res, 'Failed to retrieve categories', err.message, 400);
    }
};

// Get single category
export const getCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.category_id);
        if (!category) {
            return sendError(res, 'Category not found', {}, 404);
        }
        return sendSuccess(res, 'Category retrieved successfully', { category });
    } catch (err) {
        return sendError(res, 'Failed to retrieve category', err.message, 400);
    }
};

// Get all subcategories of a parent category
export const getSubCategories = async (req, res) => {
    try {
        const { parent_id } = req.params;
        const { page = 1, limit = 10, status } = req.query;
        
        // First, get the parent category to verify it exists
        const parentCategory = await Category.findById(parent_id);
        if (!parentCategory) {
            return sendError(res, 'Parent category not found', {}, 404);
        }

        // Build the query for subcategories
        const query = { parent: parent_id };
        if (status) query.status = status;

        // Get immediate subcategories
        const subCategories = await Category.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // Get total count for pagination
        const total = await Category.countDocuments(query);

        // For each subcategory, get its subcategories recursively
        const categoriesWithSubs = await Promise.all(
            subCategories.map(async (category) => {
                const subSubCategories = await Category.find({ parent: category._id });
                return {
                    ...category.toObject(),
                    subcategories: subSubCategories
                };
            })
        );

        return sendSuccess(res, 'Subcategories retrieved successfully', {
            parent: parentCategory,
            categories: categoriesWithSubs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        return sendError(res, 'Failed to retrieve subcategories', err.message, 400);
    }
};

// Update category
export const updateCategory = async (req, res) => {
    console.log(req.body);
    try {
        // Ensure req.body exists
        if (!req.body) {
            return sendError(res, 'Update failed', 'No update data provided', 400);
        }

        // If name is being updated, generate new slug
        if (req.body.name && typeof req.body.name === 'string') {
            // Convert name to slug format (lowercase, replace spaces with hyphens)
            const newSlug = req.body.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');

            // Check if the generated slug already exists
            const existingCategory = await Category.findOne({ 
                slug: newSlug,
                _id: { $ne: req.params.category_id }
            });

            if (existingCategory) {
                // If slug exists, append a number to make it unique
                let counter = 1;
                let uniqueSlug = newSlug;
                while (await Category.findOne({ 
                    slug: uniqueSlug,
                    _id: { $ne: req.params.category_id }
                })) {
                    uniqueSlug = `${newSlug}-${counter}`;
                    counter++;
                }
                req.body.slug = uniqueSlug;
            } else {
                req.body.slug = newSlug;
            }
        }

        // Handle thumbnail upload
        if (req.files && req.files.thumb && req.files.thumb[0]) {
            req.body.thumbnail = req.files.thumb[0].location; // S3 URL
        }

        // Handle gallery images upload
        if (req.files && req.files.gallery_images) {
            req.body.image_gallery = req.files.gallery_images.map(file => file.location); // Array of S3 URLs
        }

        // Find the category first to ensure it exists
        const existingCategory = await Category.findById(req.params.category_id);
        if (!existingCategory) {
            return sendError(res, 'Category not found', {}, 404);
        }

        // Update the category
        const category = await Category.findByIdAndUpdate(
            req.params.category_id,
            { $set: req.body },
            { 
                new: true, 
                runValidators: true,
                context: 'query'
            }
        );

        return sendSuccess(res, 'Category updated successfully', { category });
    } catch (err) {
        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(error => error.message);
            return sendError(res, 'Validation failed', errors.join(', '), 400);
        }
        
        // Handle duplicate key error (for slug)
        if (err.code === 11000) {
            return sendError(res, 'Category update failed', 'A category with this name already exists', 400);
        }

        return sendError(res, 'Failed to update category', err.message, 400);
    }
};

// Delete category
export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.category_id);
        
        if (!category) {
            return sendError(res, 'Category not found', {}, 404);
        }
        
        return sendSuccess(res, 'Category deleted successfully');
    } catch (err) {
        return sendError(res, 'Failed to delete category', err.message, 400);
    }
}; 