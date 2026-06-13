const express = require('express');
const router = express.Router();
const User = require('../models/User');

// -----------------------------------------------------
// REGISTER
// -----------------------------------------------------
router.get('/register', (req, res) => res.render('register'));

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const user = new User({ name, email, password, role });
    await user.save();

    // Store session after register
    req.session.user = { 
      _id: user._id, 
      name: user.name, 
      role: user.role 
    };

    // Redirect to homepage or dashboard
    res.redirect('/');
  } catch (err) {
    console.error(err);
    req.session.message = { 
      type: 'danger', 
      text: 'Registration failed. Email may already exist.' 
    };
    res.redirect('/register');
  }
});

// -----------------------------------------------------
// LOGIN
// -----------------------------------------------------
router.get('/login', (req, res) => res.render('login'));

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      req.session.message = { type: 'danger', text: 'Invalid credentials' };
      return res.redirect('/login');
    }

    // Compare password
    const ok = await user.comparePassword(password);
    if (!ok) {
      req.session.message = { type: 'danger', text: 'Invalid credentials' };
      return res.redirect('/login');
    }

    // Save user session
    req.session.user = { 
      _id: user._id, 
      name: user.name, 
      role: user.role 
    };

    // 🔥 DIRECT DASHBOARD REDIRECT — Works Perfect!
    if (user.role === 'patient') return res.redirect('/patient/dashboard');
    if (user.role === 'technician') return res.redirect('/technician/dashboard');
    if (user.role === 'admin') return res.redirect('/admin/dashboard');

    res.redirect('/');
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Login error' };
    res.redirect('/login');
  }
});

// -----------------------------------------------------
// LOGOUT
// -----------------------------------------------------
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// -----------------------------------------------------
// OPTIONAL: Role Selection
// -----------------------------------------------------
router.get('/login-select', (req, res) => {
  res.render('login_select');
});

module.exports = router;
