const { body } = require('express-validator');

const createProductDescriptionValidator = [
    body('product_id')
        .notEmpty()
        .withMessage('Product ID is required')
        .isString()
        .withMessage('Product ID must be a string'),
    
    body('title')
        .notEmpty()
        .withMessage('Title is required')
        .isString()
        .withMessage('Title must be a string')
        .trim(),
    
    body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .trim(),
    
    body('meta_details')
        .optional()
        .isArray()
        .withMessage('Meta details must be an array')
        .custom((value) => {
            if (!Array.isArray(value)) return true;
            return value.every(item => typeof item === 'string');
        })
        .withMessage('All meta details must be strings'),
    
    body('language')
        .optional()
        .isIn(['en', 'fr', 'es'])
        .withMessage('Language must be one of: en, fr, es')
        .trim()
];

const updateProductDescriptionValidator = [
    body('title')
        .optional()
        .isString()
        .withMessage('Title must be a string')
        .trim(),
    
    body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .trim(),
    
    body('meta_details')
        .optional()
        .isArray()
        .withMessage('Meta details must be an array')
        .custom((value) => {
            if (!Array.isArray(value)) return true;
            return value.every(item => typeof item === 'string');
        })
        .withMessage('All meta details must be strings'),
    
    body('language')
        .optional()
        .isIn(['en', 'fr', 'es'])
        .withMessage('Language must be one of: en, fr, es')
        .trim()
];

module.exports = {
    createProductDescriptionValidator,
    updateProductDescriptionValidator
}; 