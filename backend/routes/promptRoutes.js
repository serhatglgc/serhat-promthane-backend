const express = require('express');
const router = express.Router();
const {
    getPrompts, getPromptById, createPrompt, deletePrompt, getCategories,
    toggleLike, checkInteractions, addComment, getComments, toggleSave, getSavedPrompts, incrementCopy
} = require('../controllers/promptController');
const { protect } = require('../middleware/authMiddleware');

const upload = require('../middleware/uploadMiddleware');

router.get('/prompts', getPrompts);
router.get('/prompts/:id', getPromptById);
router.post('/prompts', protect, upload.array('images', 3), createPrompt);
router.delete('/prompts/:id', protect, deletePrompt);
router.post('/prompts/:id/copy', protect, incrementCopy);

// Social Routes
router.post('/like', protect, toggleLike);
router.get('/interactions/:id', protect, checkInteractions);
router.post('/comments', protect, addComment);
router.get('/comments/:prompt_id', getComments);
router.post('/save', protect, toggleSave);
router.get('/saved', protect, getSavedPrompts);

router.get('/categories', getCategories);

module.exports = router;
