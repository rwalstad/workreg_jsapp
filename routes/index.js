// routes/index.js
const express = require('express');
const router = express.Router();
//const app = require('../api/app');
const { requireLogin } = require('../middleware/auth');

// Home route (safe version)
router.get('/', (req, res) => {
  // Check that req.session exists before reading .user
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return res.redirect('/login');
});

// Logout route (safe version)
router.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      res.redirect('/login');
    });
  } else {
    res.redirect('/login');
  }
});

module.exports = router;
