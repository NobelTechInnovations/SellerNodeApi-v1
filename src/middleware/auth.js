const jwt = require('jsonwebtoken');
const User = require('../models/user');

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
                userId: decoded.id,
                phone: decoded.phone
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

        const user = await User.findById(decoded.id);

        if (!user) {
            console.error('User not found for token:', {
                userId: decoded.id,
            });
            return res.status(401).json({ 
                success: false, 
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
        }

        // Add token and User info to request
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Authentication failed',
            error: 'AUTH_FAILED'
        });
    }
};

module.exports = auth; 