const express = require('express');
const router = express.Router();
const { getUsers, deleteUser, getAdminPrompts, deleteAdminPrompt } = require('../controllers/adminController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.use(protect, isAdmin); // Protect all admin routes

router.route('/users').get(getUsers);
router.route('/users/:id').delete(deleteUser);
router.route('/prompts').get(getAdminPrompts);
router.route('/prompts/:id').delete(deleteAdminPrompt);

module.exports = router;
