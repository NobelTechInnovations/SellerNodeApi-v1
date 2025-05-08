// write function to generate JWT token
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

exports.generateToken = (user) => {
    const payload = {
        id: user._id,
        role: user.role,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    // 7d means 7 days
    // You can adjust the time duration according to your requirement
};

// write function to verify JWT token
exports.verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return sendError(res, 'No token provided', null, 401);
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return sendError(res, 'Failed to authenticate token', err.message, 401);
        }
        req.userId = decoded.id;
        req.role = decoded.role;
        next();
    });
}