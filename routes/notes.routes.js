/*
================================================================
File: server/routes/notes.routes.js (Updated)
Description: Adds DELETE and PUT endpoints for notes.
================================================================
*/
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs'); // Import Node.js File System module
const path = require('path'); // Import Node.js Path module
const Note = require('../models/note.model');
const Comment = require('../models/comment.model');
const authMiddleware = require('../middleware/auth.middleware');

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/videos/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Protect all routes in this file
router.use(authMiddleware);

// --- POST /api/notes ---
// Creates a new note.
router.post('/', upload.single('videoFile'), async (req, res) => {
    try {
        const { title, description } = req.body;
        
        const videoPath = req.file 
            ? req.file.path 
            : 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4';

        const newNote = new Note({
            title,
            description,
            userId: req.user.id,
            videoPath: videoPath
        });

        const savedNote = await newNote.save();
        res.status(201).json(savedNote);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- GET /api/notes ---
// Fetches all notes for the currently logged-in user.
router.get('/', async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- PUT /api/notes/:id ---
// Updates a specific note.
router.put('/:id', upload.single('videoFile'), async (req, res) => {
    try {
        const { title, description } = req.body;
        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        // Ensure the user owns the note
        if (note.userId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        // Update text fields
        note.title = title || note.title;
        note.description = description || note.description;

        // Handle new video upload
        if (req.file) {
            // Delete the old video file if it's a local file
            if (note.videoPath && !note.videoPath.startsWith('http')) {
                const oldFilePath = path.join(__dirname, '..', note.videoPath);
                fs.unlink(oldFilePath, (err) => {
                    if (err) console.error('Error deleting old video file:', err);
                });
            }
            // Set the new video path
            note.videoPath = req.file.path;
        }

        const updatedNote = await note.save();
        res.json(updatedNote);
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- DELETE /api/notes/:id ---
// Deletes a specific note.
router.delete('/:id', async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        // Ensure the user owns the note
        if (note.userId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        // Delete the associated video file if it's a local file
        if (note.videoPath && !note.videoPath.startsWith('http')) {
            const filePath = path.join(__dirname, '..', note.videoPath);
            fs.unlink(filePath, (err) => {
                if (err) console.error('Error deleting video file:', err);
            });
        }

        // Delete all comments associated with the note
        await Comment.deleteMany({ noteId: req.params.id });

        // Delete the note itself
        await Note.findByIdAndDelete(req.params.id);

        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});


// --- Like & Comment Routes ---

// --- PUT /api/notes/:id/like ---
// Toggles a like on a note for the logged-in user.
router.put('/:id/like', async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        if (!Array.isArray(note.likes)) {
            note.likes = [];
        }

        const index = note.likes.indexOf(req.user.id);

        if (index === -1) {
            note.likes.push(req.user.id);
        } else {
            note.likes.splice(index, 1);
        }

        await note.save();
        res.json(note);
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- POST /api/notes/:id/comments ---
// Adds a new comment to a note.
router.post('/:id/comments', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Comment text is required' });
        }

        const newComment = new Comment({
            text,
            noteId: req.params.id,
            author: req.user.id
        });

        const savedComment = await newComment.save();
        const populatedComment = await Comment.findById(savedComment._id).populate('author', 'username');
        
        res.status(201).json(populatedComment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- GET /api/notes/:id/comments ---
// Gets all comments for a specific note.
router.get('/:id/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ noteId: req.params.id })
            .populate('author', 'username')
            .sort({ createdAt: 'desc' });
        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
