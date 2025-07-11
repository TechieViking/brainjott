// server/routes/profile.routes.js

const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const authMiddleware = require('../middleware/auth.middleware'); // Import our middleware

// GET /api/profile
// This is a protected route.
// We add `authMiddleware` as a second argument. The request will only proceed
// to the async (req, res) handler if the middleware successfully authenticates the user.
router.get('/', authMiddleware, async (req, res) => {
    try {
        // The user's ID was attached to req.user by the middleware.
        // We fetch the user's data from the database but exclude the password for security.
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
