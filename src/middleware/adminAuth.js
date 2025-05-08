import { sendError } from '../utils/responseHandler.js';
import jwt from 'jsonwebtoken';
import Admin from '../models/admin/Admin.js';

const adminAuth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return sendError(res, 'No token provided', null, 401);
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return sendError(res, 'No token provided', null, 401);
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return sendError(res, 'Invalid token', null, 401);
        }

        // Find admin by id
        const admin = await Admin.findById(decoded.id).select('-password');
        if (!admin) {
            return sendError(res, 'Admin not found', null, 404);
        }

        // Check admin role
        if (!['admin', 'manager'].includes(admin.role)) {
            return sendError(res, 'Access denied. Admin privileges required.', null, 403);
        }

        // Set admin in request
        req.admin = admin;
        next();
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        if (error.name === 'JsonWebTokenError') {
            return sendError(res, 'Invalid token', null, 401);
        }
        if (error.name === 'TokenExpiredError') {
            return sendError(res, 'Token expired', null, 401);
        }
        return sendError(res, 'Authentication failed', error.message, 500);
    }
};

export default adminAuth; 