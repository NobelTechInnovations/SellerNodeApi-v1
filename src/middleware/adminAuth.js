import { sendError } from '../utils/responseHandler.js';

const adminAuth = async (req, res, next) => {
    try {
        // Check if user exists and has admin role
        if (!req.user || !req.user.role || !['admin', 'manager'].includes(req.user.role)) {
            return sendError(res, 'Access denied. Admin privileges required.', null, 403);
        }
        next();
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        return sendError(res, 'Authentication failed', error.message, 500);
    }
};

export default adminAuth; 