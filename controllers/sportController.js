const Sport = require('../models/Sport');
const Session = require('../models/Session');

exports.getAllSports = async (req, res) => {
  try {
    const sports = await Sport.find();
    res.json(sports);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addSport = async (req, res) => {
  try {
    const { name } = req.body;
    if (await Sport.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } })) {
      return res.status(400).json({ message: 'Sport already exists' });
    }
    const sport = new Sport({ name });
    await sport.save();
    res.status(201).json(sport);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteSport = async (req, res) => {
  try {
    const { id } = req.params;
    // Optionally: Remove sessions related to this sport too
    await Sport.findByIdAndDelete(id);
    res.json({ message: 'Sport deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.editSport = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const sport = await Sport.findByIdAndUpdate(id, { name }, { new: true });
    res.json(sport);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};