import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET;

export const generateToken = (customer) => {
    const payload = {
        id: customer._id,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
};

// write function to verify JWT token
export const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return sendError(res, 'No token provided', null, 401);
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return sendError(res, 'Failed to authenticate token', err.message, 401);
        }
        req.customerId = decoded.id;
        next();
    });
}