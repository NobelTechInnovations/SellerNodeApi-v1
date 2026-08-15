import jwt from 'jsonwebtoken';
import Customer from '../models/customers/Customer.js';

// Behavior tracking and the home feed need to work for BOTH guest browsers
// (anon_id only) and logged-in customers — unlike the hard `auth`
// middleware, this never 401s. If a valid Bearer token is present it
// attaches req.customer; otherwise req.customer stays null and the request
// proceeds as a guest.
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.customer = null;
            return next();
        }

        const token = authHeader.replace('Bearer ', '').trim();
        if (!token) {
            req.customer = null;
            return next();
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const customer = await Customer.findById(decoded.customerId);
            req.customer = customer || null;
        } catch {
            // Invalid/expired token — proceed as guest rather than blocking.
            req.customer = null;
        }

        next();
    } catch {
        req.customer = null;
        next();
    }
};

export default optionalAuth;
