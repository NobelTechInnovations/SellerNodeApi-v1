const { sendError } = require('../utils/responseHandler');

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Handle JSON parsing errors
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return sendError(res, 'Invalid JSON format in request body', 'INVALID_JSON', 400);
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
        return sendError(res, 'Validation error', err.message, 400);
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return sendError(res, 'Invalid token', 'INVALID_TOKEN', 401);
    }

    if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Token expired', 'TOKEN_EXPIRED', 401);
    }

    // Handle MongoDB duplicate key errors
    if (err.code === 11000) {
        return sendError(res, 'Duplicate field value entered', {
            error: 'DUPLICATE_KEY',
            field: Object.keys(err.keyValue)[0]
        }, 400);
    }

    // Default error
    return sendError(res, err.message || 'Internal server error', err.name || 'INTERNAL_SERVER_ERROR', err.status || 500);
};

module.exports = errorHandler;
  