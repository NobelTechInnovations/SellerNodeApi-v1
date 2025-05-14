import Category from '../../models/products/category.js';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

// Top-level categories only
export const getCategories = async (req, res) => {
    try {
      const masterCategories = await Category.find({ parent: null })
        .sort({ createdAt: -1 })
        .lean();
  
      const categoriesWithChildFlag = await Promise.all(
        masterCategories.map(async (category) => {
          const hasChildren = await Category.exists({ parent: category._id });
          return {
            ...category,
            hasChildren: !!hasChildren
          };
        })
      );
  
      return sendSuccess(res, 'Master categories retrieved successfully', {
        categories: categoriesWithChildFlag
      });
    } catch (err) {
      return sendError(res, 'Failed to retrieve categories', err.message, 400);
    }
};
  
 
// Get all subcategories of a parent category
// Get all subcategories of a parent category
export const getSubCategories = async (req, res) => {
    try {
      const { category_id } = req.params;
  
      // Verify parent category exists
      const parentCategory = await Category.findById(category_id);
      if (!parentCategory) {
        return sendError(res, 'Parent category not found', {}, 404);
      }
  
      // Get immediate subcategories
      const subCategories = await Category.find({ parent: category_id }).sort({ createdAt: -1 });
  
      // Get subcategories with nested child flag
      const categoriesWithSubs = await Promise.all(
        subCategories.map(async (category) => {
          const hasChildren = await Category.exists({ parent: category._id });
          return {
            ...category.toObject(),
            hasChildren: !!hasChildren, // true if child categories exist
          };
        })
      );
  
      return sendSuccess(res, 'Subcategories retrieved successfully', {
        parent: parentCategory,
        categories: categoriesWithSubs,
      });
    } catch (err) {
      return sendError(res, 'Failed to retrieve subcategories', err.message, 400);
    }
  };


  // Get parent categories
  export const getParentCategory = async (req, res) => {
    try {
      const { category_id } = req.params;
  
      let category = await Category.findById(category_id).lean();
      if (!category) {
        return sendError(res, 'Category not found', {}, 404);
      }
  
      const hierarchy = [category]; // Start with the passed category
  
      // Loop upward to the root
      while (category.parent) {
        category = await Category.findById(category.parent).lean();
        if (category) hierarchy.unshift(category); // Add parent to the beginning
        else break;
      }
  
      return sendSuccess(res, 'Parent category hierarchy retrieved successfully', {
        hierarchy
      });
    } catch (err) {
      return sendError(res, 'Failed to retrieve parent hierarchy', err.message, 400);
    }
  };
  