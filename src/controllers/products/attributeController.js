import Attribute from '../../models/products/attribute.js';
import AttributeOption from '../../models/products/attributeOption.js';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

// Create attribute
export const createAttribute = async (req, res) => {
    try {
        const attribute = await Attribute.create(req.body);
        return sendSuccess(res, 'Attribute created successfully', { attribute });
    } catch (err) {
        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(error => error.message);
            return sendError(res, 'Validation failed', errors.join(', '), 400);
        }
        
        // Handle duplicate key error (for name)
        if (err.code === 11000) {
            return sendError(res, 'Attribute creation failed', 'An attribute with this name already exists', 400);
        }

        return sendError(res, 'Failed to create attribute', err.message, 400);
    }
};

// Get all attributes
export const getAttributes = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const attributesWithOptions = await Attribute.aggregate([
            {
                $sort: { createdAt: -1 }
            },
            {
                $skip: skip
            },
            {
                $limit: parseInt(limit)
            },
            {
                $lookup: {
                    from: 'attributeoptions', // Collection name in lowercase & plural
                    localField: '_id',
                    foreignField: 'attributeId',
                    as: 'options'
                }
            }
        ]);

        const total = await Attribute.countDocuments();

        return sendSuccess(res, 'Attributes with options retrieved successfully', {
            attributes: attributesWithOptions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        return sendError(res, 'Failed to retrieve attributes with options', err.message, 400);
    }
};

// Get single attribute
export const getAttribute = async (req, res) => {
    try {
        const attribute = await Attribute.findById(req.params.attribute_id);
        if (!attribute) {
            return sendError(res, 'Attribute not found', {}, 404);
        }
        return sendSuccess(res, 'Attribute retrieved successfully', { attribute });
    } catch (err) {
        return sendError(res, 'Failed to retrieve attribute', err.message, 400);
    }
};

// Update attribute
export const updateAttribute = async (req, res) => {
    console.log(req.params);
    try {
        // Check if name is being updated and if it already exists
        if (req.body.name) {
            const existingAttribute = await Attribute.findOne({ 
                name: req.body.name,
                _id: { $ne: req.params.attributeid }
            });
            if (existingAttribute) {
                return sendError(res, 'Attribute update failed', 'An attribute with this name already exists', 400);
            }
        }

        const attribute = await Attribute.findByIdAndUpdate(
            req.params.attribute_id,
            { $set: req.body },
            { 
                new: true, 
                runValidators: true,
                context: 'query'
            }
        );

        if (!attribute) {
            return sendError(res, 'Attribute not found', {}, 404);
        }

        return sendSuccess(res, 'Attribute updated successfully', { attribute });
    } catch (err) {
        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(error => error.message);
            return sendError(res, 'Validation failed', errors.join(', '), 400);
        }
        
        // Handle duplicate key error (for name)
        if (err.code === 11000) {
            return sendError(res, 'Attribute update failed', 'An attribute with this name already exists', 400);
        }

        return sendError(res, 'Failed to update attribute', err.message, 400);
    }
};

// Delete attribute
export const deleteAttribute = async (req, res) => {
    try {
        const attribute = await Attribute.findByIdAndDelete(req.params.attribute_id);
        
        if (!attribute) {
            return sendError(res, 'Attribute not found', {}, 404);
        }
        
        return sendSuccess(res, 'Attribute deleted successfully');
    } catch (err) {
        return sendError(res, 'Failed to delete attribute', err.message, 400);
    }
}; 