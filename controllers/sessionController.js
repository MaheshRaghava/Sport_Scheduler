const Session = require('../models/Session');
const Sport = require('../models/Sport');

// Admin: Create session
exports.createSession = async (req, res) => {
  try {
    const { sport, venue, date, time, playerEmails, description, createdBy, requiredPlayers, team1, team2 } = req.body;
    // Optional: Check sport exists
    const sportObj = await Sport.findOne({ name: sport });
    if (!sportObj) return res.status(400).json({ message: 'Sport does not exist' });

    // Parse date - allow either ISO string or date+time
    let sessionDate;
    if (date && time) {
      sessionDate = new Date(`${date}T${time}`);
    } else if (date) {
      sessionDate = new Date(date);
    }
    if (!sessionDate || isNaN(sessionDate)) return res.status(400).json({ message: 'Invalid date/time' });

    const session = new Session({
      sport,
      venue,
      date: sessionDate,
      playerEmails: Array.isArray(playerEmails) ? playerEmails.map(email => ({
        email,
        joined: false,
        cancelled: false,
        cancelReason: ''
      })) : [],
      team1: Array.isArray(team1) ? team1 : [],
      team2: Array.isArray(team2) ? team2 : [],
      description,
      createdBy: createdBy || 'admin',
      requiredPlayers
    });
    await session.save();
    res.status(201).json(session);
  } catch (err) {
    console.error('Create Session Error:', err);
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
    console.error('Join Session Error:', err);
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
    console.error('Cancel Session Error:', err);
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
    console.error('Get Player Sessions Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all sessions (admin)
exports.getAllSessions = async (req, res) => {
  try {
    const sessions = await Session.find();
    res.json(sessions);
  } catch (err) {
    console.error('Get All Sessions Error:', err);
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
    console.error('Get Cancelled By Players Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ADMIN: Edit session by id (PUT /api/sessions/:id)
exports.editSession = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sport, venue, date, time, playerEmails, description, requiredPlayers, team1, team2
    } = req.body;
    const session = await Session.findById(id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    // Parse date
    let sessionDate;
    if (date && time) {
      sessionDate = new Date(`${date}T${time}`);
    } else if (date) {
      sessionDate = new Date(date);
    }
    if (!sessionDate || isNaN(sessionDate)) return res.status(400).json({ message: 'Invalid date/time' });

    session.sport = sport;
    session.venue = venue;
    session.date = sessionDate;
    session.playerEmails = Array.isArray(playerEmails) ? playerEmails.map(email => {
      const old = session.playerEmails.find(p => p.email === email) || {};
      return {
        email,
        joined: old.joined || false,
        cancelled: old.cancelled || false,
        cancelReason: old.cancelReason || ''
      }
    }) : [];
    session.team1 = Array.isArray(team1) ? team1 : [];
    session.team2 = Array.isArray(team2) ? team2 : [];
    session.description = description;
    session.requiredPlayers = requiredPlayers;
    await session.save();
    res.json(session);
  } catch (err) {
    console.error('Edit Session Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ADMIN: Delete session by id (DELETE /api/sessions/:id)
exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Session.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Session not found' });
    res.json({ message: 'Session deleted' });
  } catch (err) {
    console.error('Delete Session Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};