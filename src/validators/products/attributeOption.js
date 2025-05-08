import Joi from 'joi';

// Create attribute option validator
export const createAttributeOption = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().required().trim().messages({
            'string.empty': 'Option name is required',
            'any.required': 'Option name is required'
        }),
        value: Joi.string().required().trim().messages({
            'string.empty': 'Option value is required',
            'any.required': 'Option value is required'
        }),
        attributeId: Joi.string().required().messages({
            'string.empty': 'Attribute ID is required',
            'any.required': 'Attribute ID is required'
        })
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            error: error.details[0].message
        });
    }
    next();
};

// Update attribute option validator
export const updateAttributeOption = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().trim().messages({
            'string.empty': 'Option name cannot be empty'
        }),
        value: Joi.string().trim().messages({
            'string.empty': 'Option value cannot be empty'
        }),
        attributeId: Joi.string()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            error: error.details[0].message
        });
    }
    next();
};

// Get attribute option validator
export const getAttributeOption = (req, res, next) => {
    const schema = Joi.object({
        option_id: Joi.string().required().messages({
            'string.empty': 'Option ID is required',
            'any.required': 'Option ID is required'
        })
    });

    const { error } = schema.validate(req.params);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            error: error.details[0].message
        });
    }
    next();
};

// Delete attribute option validator
export const deleteAttributeOption = (req, res, next) => {
    const schema = Joi.object({
        option_id: Joi.string().required().messages({
            'string.empty': 'Option ID is required',
            'any.required': 'Option ID is required'
        })
    });

    const { error } = schema.validate(req.params);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            error: error.details[0].message
        });
    }
    next();
}; 