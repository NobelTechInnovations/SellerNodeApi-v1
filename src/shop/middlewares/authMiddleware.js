import jwt from 'jsonwebtoken';
import Customer from '../models/customers/Customer.js';
import customerDbConnection from '../config/database.js';

const auth = async (req, res, next) => {
    try {
        // Get the full authorization header
        const authHeader = req.header('Authorization');
        
        if (!authHeader) {
            return res.status(401).json({ 
                success: false, 
                message: 'No authorization header found',
                error: 'AUTH_HEADER_MISSING'
            });
        }

        // Check if it starts with 'Bearer '
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid authorization format. Must start with "Bearer "',
                error: 'INVALID_AUTH_FORMAT'
            });
        }

        // Extract the token
        const token = authHeader.replace('Bearer ', '').trim();
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token found in authorization header',
                error: 'TOKEN_MISSING'
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Log successful token verification
            console.log('Token verified successfully:', {
                customerId: decoded.customerId,
            });
            
        } catch (jwtError) {
            console.error('JWT Verification Error:', {
                error: jwtError.name,
                message: jwtError.message,
                token: token.substring(0, 10) + '...' // Log only first 10 chars for security
            });

            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Token has expired',
                    error: 'TOKEN_EXPIRED'
                });
            }
            if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid token format',
                    error: 'TOKEN_MALFORMED'
                });
            }
            return res.status(401).json({ 
                success: false, 
                message: 'Token validation failed',
                error: 'TOKEN_INVALID'
            });
        }

        try {
            // Check customer database connection state
            if (customerDbConnection.readyState !== 1) {
                console.error('Customer database not connected when trying to authenticate customer');
                return res.status(503).json({
                    success: false,
                    message: 'Database connection unavailable',
                    error: 'DB_UNAVAILABLE'
                });
            }

            // Set timeout for database query
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Database query timeout')), 5000);
            });

            // Race between the customer lookup and the timeout
            const customer = await Promise.race([
                Customer.findById(decoded.customerId),
                timeoutPromise
            ]);

            if (!customer) {
                console.error('Customer not found for token:', {
                    customerId: decoded.customerId,
                });
                return res.status(401).json({ 
                    success: false, 
                    message: 'Customer not found',
                    error: 'CUSTOMER_NOT_FOUND'
                });
            }

            // Check if customer is active
            if (customer.accountStatus === 'suspended') {
                return res.status(401).json({
                    success: false,
                    message: 'Customer account is suspended',
                    error: 'CUSTOMER_SUSPENDED'
                });
            }

            // Add token and Customer info to request
            req.customer = customer;
            req.token = token;
            next();
        } catch (dbError) {
            console.error('Database error in auth middleware:', dbError);
            
            if (dbError.message === 'Database query timeout') {
                return res.status(503).json({
                    success: false,
                    message: 'Database operation timed out',
                    error: 'DB_TIMEOUT'
                });
            }
            
            return res.status(500).json({ 
                success: false, 
                message: 'Database error during authentication',
                error: 'DB_ERROR'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Authentication failed',
            error: 'AUTH_FAILED'
        });
    }
};

export default auth; 