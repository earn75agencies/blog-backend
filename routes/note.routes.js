const express = require('express');
const {
  getPostNotes,
  getUserNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  togglePin,
  searchNotes,
  getNoteStats,
} = require('../controllers/note.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Note statistics
router.get('/stats', getNoteStats);

// Search notes
router.get('/search', searchNotes);

// Get all user notes
router.get('/', getUserNotes);

// Get notes for a specific post
router.get('/post/:postId', getPostNotes);

// Get single note
router.get('/:id', getNote);

// Create note (for a post)
router.post('/post/:postId', createNote);

// Update note
router.put('/:id', updateNote);

// Toggle pin
router.patch('/:id/pin', togglePin);

// Delete note
router.delete('/:id', deleteNote);

module.exports = router;



