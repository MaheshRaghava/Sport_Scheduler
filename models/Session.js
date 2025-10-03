const mongoose = require('mongoose');

const playerEmailSchema = new mongoose.Schema({
  email:        { type: String, required: true },
  joined:       { type: Boolean, default: false },
  cancelled:    { type: Boolean, default: false },
  cancelReason: { type: String, default: '' }
});

const sessionSchema = new mongoose.Schema({
  sport:        { type: String, required: true },
  venue:        { type: String, required: true },
  date:         { type: Date, required: true },
  playerEmails: [playerEmailSchema],
  team1:        [{ type: String }], // ADDED
  team2:        [{ type: String }], // ADDED
  description:  { type: String },
  createdBy:    { type: String, required: true },
  requiredPlayers: { type: Number }, 
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);