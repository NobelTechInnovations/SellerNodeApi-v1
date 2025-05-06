const { body } = require('express-validator');

const createProductImageValidator = [
    body('thumbnail_image')
        .optional()
        .isURL()
        .withMessage('Thumbnail image must be a valid URL')
        .trim(),
    
    body('gallery_images')
        .optional()
        .isArray()
        .withMessage('Gallery images must be an array')
        .custom((value) => {
            if (!Array.isArray(value)) return true;
            return value.every(url => {
                try {
                    new URL(url);
                    return true;
                } catch {
                    return false;
                }
            });
        })
        .withMessage('All gallery images must be valid URLs')
];

const updateProductImageValidator = [
    body('thumbnail_image')
        .optional()
        .isURL()
        .withMessage('Thumbnail image must be a valid URL')
        .trim(),
    
    body('gallery_images')
        .optional()
        .isArray()
        .withMessage('Gallery images must be an array')
        .custom((value) => {
            if (!Array.isArray(value)) return true;
            return value.every(url => {
                try {
                    new URL(url);
                    return true;
                } catch {
                    return false;
                }
            });
        })
        .withMessage('All gallery images must be valid URLs')
];

module.exports = {
    createProductImageValidator,
    updateProductImageValidator
}; 