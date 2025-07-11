// server/middleware/auth.middleware.js

const jwt = require('jsonwebtoken');
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * This middleware function acts as a guard for our protected routes.
 * It checks for a valid JSON Web Token (JWT) in the request's Authorization header.
 */
const authMiddleware = (req, res, next) => {
    // Get the token from the header. The standard format is "Bearer <token>".
    const authHeader = req.header('Authorization');

    // If there's no auth header or it doesn't start with "Bearer ", deny access.
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        // Extract the token part from the header string.
        const token = authHeader.split(' ')[1];

        // Verify the token using the secret key.
        // This function will throw an error if the token is invalid or expired.
        const decodedPayload = jwt.verify(token, JWT_SECRET);

        // If verification is successful, the decoded payload (containing user id)
        // is attached to the request object.
        req.user = decodedPayload.user;

        // Pass control to the next middleware or route handler.
        next();
    } catch (error) {
        // If the token is invalid (e.g., tampered with, expired), send an error response.
        res.status(401).json({ message: 'Token is not valid.' });
    }
};

module.exports = authMiddleware;
