// routes/login.js
var express = require('express');
var router = express.Router();
const { sql, getPool } = require('../config/database');
const { requireLogin } = require('../middleware/auth');

// GET login page
router.get('/login', function(req, res, next) {
  const timeout = req.query.timeout === 'true';
  res.render('index', { 
    title: 'Login',
    error: timeout ? 'Your session has expired due to inactivity. Please login again.' : null
  });
});

// POST login form
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt for user:', username);
  
  try {
    const pool = await getPool();
    
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT * FROM Workreg.Employee WHERE email = @username');
    
    if (result.recordset.length > 0) {
      console.log('Found a user:', result.recordset[0]);
      req.session.user = {
        EmployeeID: result.recordset[0].EmployeeID,
        userFirstname: result.recordset[0].FirstName,
        userLastName: result.recordset[0].LastName,
        userEmail: result.recordset[0].Email,
        userAdminLvl: result.recordset[0].isadmin || 99
      };
      
      if (req.session.user.userAdminLvl < 10) {
        req.session.user.isAdmin = true;
      } else {
        req.session.user.isAdmin = false;
      }
      
      console.log('Lvl of user:', req.session.user.userAdminLvl);
      console.log('isAdmin set to:', req.session.user.isAdmin);   
      req.session.lastActivity = Date.now();
      res.redirect('/clock-in');
      console.log('Login successful for user:', req.session.user.userFirstname, 'with ID:', req.session.user.EmployeeID);
    } else {
      res.render('index', { 
        title: 'Login',
        error: 'Invalid username or password' 
      });
    }
    
  } catch (err) {
    console.error('Database error:', err);
    res.render('index', { 
      title: 'Login',
      error: 'An error occurred. Please try again.' 
    });
  }
  // NO finally block, NO sql.close()!
});

module.exports = router;