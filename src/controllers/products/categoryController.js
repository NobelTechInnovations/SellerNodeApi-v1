const Category = require('../../models/products/category');
const { sendSuccess, sendError } = require('../../utils/responseHandler');

// Create category
exports.createCategory = async (req, res) => {
    try {
        const category = await Category.create(req.body);
        return sendSuccess(res, 'Category created successfully', { category });
    } catch (err) {
        return sendError(res, 'Failed to create category', err.message, 400);
    }
};

// Get all categories
exports.getCategories = async (req, res) => {
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
exports.getCategory = async (req, res) => {
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
exports.getSubCategories = async (req, res) => {
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
exports.updateCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(
            req.params.category_id,
            req.body,
            { new: true }
        );

        if (!category) {
            return sendError(res, 'Category not found', {}, 404);
        }

        return sendSuccess(res, 'Category updated successfully', { category });
    } catch (err) {
        return sendError(res, 'Failed to update category', err.message, 400);
    }
};

// Delete category
exports.deleteCategory = async (req, res) => {
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