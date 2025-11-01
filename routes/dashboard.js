// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');

router.get('/dashboard', requireLogin, (req, res) => {
  res.render('dashboard', { 
    title: 'Dashboard', 
    user: req.session.user ,
    useradminlvl: req.session.user.userAdminLvl
  });
});

module.exports = router;
