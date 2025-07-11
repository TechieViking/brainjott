const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const Note = require('../models/note.model');
const authMiddleware = require('../middleware/auth.middleware');

// Protect all routes in this file
router.use(authMiddleware);

// --- GET /api/users/search?q=... ---
// Searches for users by username.
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.json([]); // Return empty array if no query
        }

        // Find users whose username matches the query (case-insensitive)
        // Exclude the current user from the search results
        // Limit to 10 results for performance
        const users = await User.find({
            username: { $regex: query, $options: 'i' },
            _id: { $ne: req.user.id } // $ne means "not equal"
        }).select('username').limit(10);

        res.json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- GET /api/users/profile/:username ---
// Fetches a public profile and all public notes for a given username.
router.get('/profile/:username', async (req, res) => {
    try {
        // Find the user by their username
        const user = await User.findOne({ username: req.params.username }).select('-password -email');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find all notes created by that user
        const notes = await Note.find({ userId: user._id }).sort({ createdAt: -1 });

        // Return the user's public profile and their notes
        res.json({ user, notes });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;