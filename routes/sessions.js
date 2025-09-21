const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

// Admin: Create session
router.post('/', sessionController.createSession);

// Player: Join session
router.patch('/join', sessionController.joinSession);

// Player: Cancel session (with reason)
router.patch('/cancel', sessionController.cancelSession);

// Player: Get sessions (by email)
router.get('/player', sessionController.getPlayerSessions);

// Admin: Get all sessions
router.get('/admin', sessionController.getAllSessions);

// Admin: Get all sessions cancelled by players (with reasons)
router.get('/cancelled-by-players', sessionController.getCancelledByPlayers);

module.exports = router;