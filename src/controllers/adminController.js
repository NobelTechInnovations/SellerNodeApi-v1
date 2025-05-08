// write all admin login and signup functions here
import Admin from '../models/admin/Admin.js';
import bcrypt from 'bcryptjs';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { generateToken } from '../utils/jwt.js';

// ADMIN LOGIN
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email }).select('+password');
        if (!admin) {
            return sendError(res, 'Invalid email or password', null, 401);
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return sendError(res, 'Invalid email or password', null, 401);
        }

        const token = await generateToken(admin);
        return sendSuccess(res, 'Logged in successfully', { token, role: admin.role });
    } catch (err) {
        return sendError(res, 'Failed to login', err.message, 500);
    }
};