const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ennuicastr_insecure_default_secret_please_change';

function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

function authMiddleware(req, res, next) {
    const token = req.cookies.auth_token;
    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            req.user = decoded;
            return next();
        }
    }
    res.status(401).json({ error: 'Unauthorized' });
}

function authOptionalMiddleware(req, res, next) {
    const token = req.cookies.auth_token;
    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            req.user = decoded;
        }
    }
    next();
}

module.exports = {
    generateToken,
    verifyToken,
    authMiddleware,
    authOptionalMiddleware,
    JWT_SECRET
};
