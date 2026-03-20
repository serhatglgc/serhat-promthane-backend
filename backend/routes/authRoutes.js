const express = require('express');
const router = express.Router();
const { register, login, verifyEmail, forgotPassword, resetPassword, getLeaderboard } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/leaderboard', getLeaderboard);

module.exports = router;
