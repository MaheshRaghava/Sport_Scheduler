const Session = require('../models/Session');
const Sport = require('../models/Sport');

// Admin: Create session
exports.createSession = async (req, res) => {
  try {
    const { sport, venue, date, time, playerEmails, description, createdBy } = req.body;
    // Optional: Check sport exists
    const sportObj = await Sport.findOne({ name: sport });
    if (!sportObj) return res.status(400).json({ message: 'Sport does not exist' });

    const session = new Session({
      sport,
      venue,
      date: new Date(`${date}T${time}`),
      playerEmails: playerEmails.map(email => ({
        email,
        joined: false,
        cancelled: false,
        cancelReason: ''
      })),
      description,
      createdBy: createdBy || 'admin'
    });
    await session.save();
    // Update sport's session count if you track it
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Player: Join session
exports.joinSession = async (req, res) => {
  try {
    const { sessionId, playerEmail } = req.body;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const player = session.playerEmails.find(p => p.email === playerEmail);
    if (!player) return res.status(400).json({ message: 'Player not listed for this session' });
    if (player.joined) return res.status(400).json({ message: 'Already joined' });

    player.joined = true;
    await session.save();
    res.json({ message: 'Joined session', session });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Player: Cancel session (add reason, mark as cancelled)
exports.cancelSession = async (req, res) => {
  try {
    const { sessionId, playerEmail, reason } = req.body;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const player = session.playerEmails.find(p => p.email === playerEmail);
    if (!player) return res.status(400).json({ message: 'Player not in session' });

    player.cancelled = true;
    player.cancelReason = reason || '';
    await session.save();
    res.json({ message: 'Session cancelled', session });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get sessions for a player (available, joined, cancelled)
exports.getPlayerSessions = async (req, res) => {
  try {
    const { email } = req.query;
    const sessions = await Session.find({ 'playerEmails.email': email });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all sessions (admin)
exports.getAllSessions = async (req, res) => {
  try {
    const sessions = await Session.find();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// For admin: get all sessions cancelled by players (with reasons)
exports.getCancelledByPlayers = async (req, res) => {
  try {
    const sessions = await Session.find({ 'playerEmails.cancelled': true });
    const cancelled = sessions.map(session => ({
      ...session._doc,
      cancelledPlayers: session.playerEmails.filter(p => p.cancelled)
    }));
    res.json(cancelled);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};