const express = require('express');
const router = express.Router();
const sportController = require('../controllers/sportController');

// Get all sports
router.get('/', sportController.getAllSports);

// Add a new sport
router.post('/', sportController.addSport);

// Delete a sport
router.delete('/:id', sportController.deleteSport);

// Edit (rename) a sport
router.put('/:id', sportController.editSport);

module.exports = router;