import { validationResult } from 'express-validator';

class BaseValidator {
    static validate(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: errors.array()
            });
        }
        next();
    }
}

export default BaseValidator; 