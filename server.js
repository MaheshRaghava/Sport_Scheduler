const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://sport-scheduler11.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.log('MongoDB connection error:', err);
    process.exit(1);
  });

// Models
const User = require('./models/User');

// Email transporter - USING ALL .ENV CONFIGURATIONS
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 465,
  secure: process.env.EMAIL_SECURE === 'true' || true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});

console.log('Email transporter created with configuration:');
console.log('Host:', process.env.EMAIL_HOST || 'smtp.gmail.com');
console.log('Port:', process.env.EMAIL_PORT || 465);
console.log('Secure:', process.env.EMAIL_SECURE === 'true' || true);

// Health Check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: process.env.PROJECT_NAME || 'Sport Scheduler',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Static routes for HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/verify-email', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'emailverify.html'));
});

// Email Verification
app.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    const savedCode = app.locals.verificationCodes?.[email];
    if (!savedCode) return res.status(400).json({ message: 'No verification code found' });

    if (parseInt(code) === savedCode) {
      await User.updateOne({ email }, { isVerified: true });
      delete app.locals.verificationCodes[email];
      return res.status(200).json({ message: 'Email verified successfully' });
    } else {
      return res.status(400).json({ message: 'Invalid verification code' });
    }
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

// Forgot/Reset Password
app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'No account with that email found' });

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password.html?token=${token}&email=${email}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset - Sport Scheduler',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Hello ${user.fullname},</h2>
          <p>You requested a password reset. Click the button below to set a new password:</p>
          <a href="${resetLink}" style="background:#00b09b; padding:10px 20px; color:#fff; text-decoration:none; border-radius:5px;">Reset Password</a>
          <p>This link will expire in 15 minutes.</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.error('Email send error:', err);
        return res.status(500).json({ message: 'Error sending email: ' + err.message });
      }
      res.status(200).json({ message: 'Password reset link sent to your email' });
    });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    const user = await User.findOne({ email, resetToken: token, resetTokenExpiry: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

    const hashedPassword = await require('bcryptjs').hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

// Custom Signup
app.post('/signup', async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    // Validate required fields
    if (!fullname || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const hashedPassword = await require('bcryptjs').hash(password, 10);

    const newUser = new User({
      fullname,
      email,
      password: hashedPassword,
      role: 'player',
      isVerified: false
    });

    await newUser.save();

    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    app.locals.verificationCodes = app.locals.verificationCodes || {};
    app.locals.verificationCodes[email] = verificationCode;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Sport Scheduler: Email Verification',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Hello ${fullname},</h2>
          <p>Thank you for signing up with <b>Sport Scheduler</b>! 🎉</p>
          <p>To complete your registration, please use the verification code below:</p>
          <h3 style="background-color: #f2f2f2; padding: 10px; display: inline-block;">${verificationCode}</h3>
          <p>Once verified, you can create, play, and enjoy scheduling your sports activities effortlessly.</p>
          <p>We're excited to have you on board!</p>
          <br>
          <p>Cheers,<br><b>Sport Scheduler Team</b></p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.error('Signup email error:', err);
        return res.status(500).json({ message: 'Error sending email: ' + err.message });
      }
      res.status(200).json({ message: 'Signup successful, verification email sent' });
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: 'User not found' });
    if (!user.isVerified) return res.status(400).json({ message: 'Email not verified' });

    const isMatch = await require('bcryptjs').compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect password' });

    res.status(200).json({ 
      message: 'Login successful', 
      user: { 
        fullname: user.fullname, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// API ROUTES
const userRoutes = require('./routes/users');
const sportRoutes = require('./routes/sports');
const sessionRoutes = require('./routes/sessions');

app.use('/api/users', userRoutes);
app.use('/api/sports', sportRoutes);
app.use('/api/sessions', sessionRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    success: false,
    error: 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server running successfully on port ${PORT}`);
  console.log(`Available at: ${process.env.FRONTEND_URL || `http://localhost:${PORT}`}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Project: ${process.env.PROJECT_NAME || 'Sport Scheduler'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false);
    console.log('Server shut down');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false);
    console.log('Server shut down');
  });
});