const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Signup
router.post('/signup', userController.signup);

// Login
router.post('/login', userController.login);

// Get all players (for stats/admin)
router.get('/players', userController.getAllPlayers);

module.exports = router;