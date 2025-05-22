class BaseController {
    constructor() {
        // Add common controller functionality here
    }

    sendResponse(res, data, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: statusCode >= 200 && statusCode < 300,
            message,
            data
        });
    }

    sendError(res, error, statusCode = 500) {
        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Internal Server Error',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

export default BaseController; 