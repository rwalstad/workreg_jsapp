// routes/profile.js
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/database');
const { requireLogin } = require('../middleware/auth');

// GET profile page
router.get('/profile', requireLogin, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT * FROM Workreg.Employee WHERE email = @username');
    
    if (result.recordset.length > 0) {
      console.log('Found a user:', result.recordset[0]);
      req.session.user = {
        EmployeeId: result.recordset[0].EmployeeID,
        userFirstname: result.recordset[0].FirstName,
        userLastName: result.recordset[0].LastName,
        userEmail: result.recordset[0].Email,
        userAdminLvl: result.recordset[0].isadmin || 99
      };
      
        console.log('Profile data retrieved for user:', req.session.user.EmployeeID);
    if (result.recordset.length === 0) {
      return res.render('profile', { 
        title: 'Profile', 
        user: req.session.user, 
        message: 'User not found', 
        messageType: 'error' 
      });
    }

    res.render('profile', { 
      title: 'Profile', 
      user: result.recordset[0], 
      message: null,
      messageType: null
    });

    }
   } catch (err) {
    console.error('Database error:', err);
    res.render('profile', { 
      title: 'Profile', 
      user: req.session.user, 
      message: 'Error loading profile', 
      messageType: 'error' 
    });
  }
});

// POST update profile
router.post('/profile/update', requireLogin, async (req, res) => {
  const { firstName, lastName, department, position, phone, address } = req.body;

  try {
    const pool = await getPool();
    await pool.request()
      .input('employeeId', sql.Int, req.session.user.EmployeeId)
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('department', sql.NVarChar, department)
      .input('position', sql.NVarChar, position)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address)
      .query(`
        UPDATE Workreg.Employee
        SET 
          FirstName = @firstName,
          LastName = @lastName,
          Department = @department,
          Position = @position,
          Phone = @phone,
          Address = @address
        WHERE EmployeeId = @employeeId
      `);

    console.log('Profile updated for user:', req.session.user.EmployeeId);
    res.render('profile', { 
      title: 'Profile', 
      user: { 
        ...req.session.user, 
        FirstName: firstName, 
        LastName: lastName, 
        Department: department,
        Position: position,
        Phone: phone,
        Address: address
      },
      message: 'Profile updated successfully!',
      messageType: 'success'
    });

  } catch (err) {
    console.error('Database error:', err);
    res.render('profile', { 
      title: 'Profile', 
      user: req.session.user, 
      message: 'Failed to update profile', 
      messageType: 'error' 
    });
  }
});

module.exports = router;
