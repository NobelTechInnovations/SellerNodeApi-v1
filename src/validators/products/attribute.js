import Joi from 'joi';

// Create attribute validator
export const createAttribute = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().required().trim().messages({
            'string.empty': 'Attribute name is required',
            'any.required': 'Attribute name is required'
        }),
        isRequired: Joi.boolean().default(false)
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

// Update attribute validator
export const updateAttribute = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().trim().messages({
            'string.empty': 'Attribute name cannot be empty'
        }),
        isRequired: Joi.boolean()
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

// Get attribute validator
export const getAttribute = (req, res, next) => {
    const schema = Joi.object({
        attribute_id: Joi.string().required().messages({
            'string.empty': 'Attribute ID is required',
            'any.required': 'Attribute ID is required'
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

// Delete attribute validator
export const deleteAttribute = (req, res, next) => {
    const schema = Joi.object({
        attribute_id: Joi.string().required().messages({
            'string.empty': 'Attribute ID is required',
            'any.required': 'Attribute ID is required'
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