const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Email verification and password reset logic should be here if not already in server.js

exports.signup = async (req, res) => {
  try {
    const { fullname, email, password } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already registered' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ fullname, email, password: hashedPassword, role: 'player', isVerified: false });
    await newUser.save();
    // Email verification logic here (can use nodemailer)
    return res.status(200).json({ message: 'Signup successful, verification email sent' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'User not found' });
  if (!user.isVerified) return res.status(400).json({ message: 'Email not verified' });
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Incorrect password' });
  return res.status(200).json({ message: 'Login successful', user: { fullname: user.fullname, email: user.email, role: user.role } });
};

exports.getAllPlayers = async (req, res) => {
  try {
    const players = await User.find({ role: 'player' }, 'fullname email isVerified');
    res.json(players);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};