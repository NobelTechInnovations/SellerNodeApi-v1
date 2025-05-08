import AttributeOption from '../../models/products/attributeOption.js';
import Attribute from '../../models/products/attribute.js';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';
import mongoose from 'mongoose';

// Create attribute option
export const createAttributeOption = async (req, res) => {
    try {
        // Validate attributeId format
        if (!mongoose.Types.ObjectId.isValid(req.body.attributeId)) {
            return sendError(res, 'Invalid attribute ID format', {}, 400);
        }

        // Check if attribute exists
        const attribute = await Attribute.findById(req.body.attributeId);
        if (!attribute) {
            return sendError(res, 'Attribute not found', { attributeId: req.body.attributeId }, 404);
        }

        const attributeOption = await AttributeOption.create(req.body);
        return sendSuccess(res, 'Attribute option created successfully', { 
            attributeOption,
            attribute: {
                _id: attribute._id,
                name: attribute.name
            }
        });
    } catch (err) {
        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(error => error.message);
            return sendError(res, 'Validation failed', errors.join(', '), 400);
        }
        
        // Handle duplicate key error
        if (err.code === 11000) {
            return sendError(res, 'Attribute option creation failed', 'An option with this name and value already exists for this attribute', 400);
        }

        return sendError(res, 'Failed to create attribute option', err.message, 400);
    }
};

// Get all attribute options
export const getAttributeOptions = async (req, res) => {
    try {
        const { page = 1, limit = 10, attributeId } = req.query;
        const query = {};

        if (attributeId) {
            query.attributeId = attributeId;
        }

        const attributeOptions = await AttributeOption.find(query)
            .populate('attributeId', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await AttributeOption.countDocuments(query);

        return sendSuccess(res, 'Attribute options retrieved successfully', {
            attributeOptions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        return sendError(res, 'Failed to retrieve attribute options', err.message, 400);
    }
};

// Get single attribute option
export const getAttributeOption = async (req, res) => {
    try {
        const attributeOption = await AttributeOption.findById(req.params.option_id)
            .populate('attributeId', 'name');
            
        if (!attributeOption) {
            return sendError(res, 'Attribute option not found', {}, 404);
        }
        return sendSuccess(res, 'Attribute option retrieved successfully', { attributeOption });
    } catch (err) {
        return sendError(res, 'Failed to retrieve attribute option', err.message, 400);
    }
};

// Update attribute option
export const updateAttributeOption = async (req, res) => {
    try {
        // If attributeId is being updated, validate it
        if (req.body.attributeId) {
            if (!mongoose.Types.ObjectId.isValid(req.body.attributeId)) {
                return sendError(res, 'Invalid attribute ID format', {}, 400);
            }

            const attribute = await Attribute.findById(req.body.attributeId);
            if (!attribute) {
                return sendError(res, 'Attribute not found', { attributeId: req.body.attributeId }, 404);
            }
        }

        const attributeOption = await AttributeOption.findByIdAndUpdate(
            req.params.option_id,
            { $set: req.body },
            { 
                new: true, 
                runValidators: true,
                context: 'query'
            }
        ).populate('attributeId', 'name');

        if (!attributeOption) {
            return sendError(res, 'Attribute option not found', { optionId: req.params.option_id }, 404);
        }

        return sendSuccess(res, 'Attribute option updated successfully', { attributeOption });
    } catch (err) {
        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(error => error.message);
            return sendError(res, 'Validation failed', errors.join(', '), 400);
        }
        
        // Handle duplicate key error
        if (err.code === 11000) {
            return sendError(res, 'Attribute option update failed', 'An option with this name and value already exists for this attribute', 400);
        }

        return sendError(res, 'Failed to update attribute option', err.message, 400);
    }
};

// Delete attribute option
export const deleteAttributeOption = async (req, res) => {
    try {
        const attributeOption = await AttributeOption.findByIdAndDelete(req.params.option_id);
        
        if (!attributeOption) {
            return sendError(res, 'Attribute option not found', {}, 404);
        }
        
        return sendSuccess(res, 'Attribute option deleted successfully');
    } catch (err) {
        return sendError(res, 'Failed to delete attribute option', err.message, 400);
    }
}; 