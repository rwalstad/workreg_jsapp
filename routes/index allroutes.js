var express = require('express');
var router = express.Router();
var sql = require('mssql');
var dbConfig = require('../config/srvazure');

// Middleware to check if user is logged in
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// Home page
router.get('/', function(req, res, next) {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Dashboard
router.get('/dashboard', requireLogin, function(req, res, next) {
  res.render('dashboard', { 
    title: 'Dashboard', 
    user: req.session.user 
  });
});

// Clock In page- GET
router.get('/clock-in', requireLogin, async function(req, res, next) {
  try {
    await sql.connect(dbConfig);
    console.log('getting worklog for user:', req.session.user.userFirstname, 'with ID:', req.session.user.EmployeeId);
    // Check if user is currently clocked in
    const activeSession = await sql.query`
      SELECT TOP 1 * FROM Workreg.Worklog 
      WHERE EmployeeID = ${req.session.user.EmployeeId} 
      AND LogoutTime IS NULL
      ORDER BY LoginTime DESC
    `;
    console.log('43: ACTIVES CHECKED for STATUS OF clock-in:', activeSession.recordset.length);
    // Get templates for dropdown
    const templatesResult = await sql.query`
      SELECT TemplateID, TemplateName
      FROM WorkReg.WorkTemplate
      ORDER BY TemplateName
    `;
    console.log('50: Templates for clock-in:', templatesResult.recordset);

    // Get recent entries
    const recentEntries = await sql.query`
      SELECT TOP 10
        WorkDate,
        LoginTime,
        LogoutTime,
        workTemplateID,
        DATEDIFF(MINUTE, LoginTime, LogoutTime) AS durationMinutes,
        notes,
        ExtraTime
      FROM Workreg.Worklog
      WHERE EmployeeID = ${req.session.user.EmployeeId}
      ORDER BY LoginTime DESC
    `;
    console.log('63: length of recentEntries.recordset:', recentEntries.recordset.length);
    // Format entries
    const WorkEntries = recentEntries.recordset.map(entry => ({
      WorkDate: new Date(entry.WorkDate).toLocaleDateString('en-GB'),
      clockInTime: new Date(entry.LoginTime).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      clockOutTime: entry.LogoutTime ? new Date(entry.LogoutTime).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }) : null,
      duration: entry.durationMinutes ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m` : null,
      template: entry.workTemplateID,
      notes: entry.notes,
      ot: entry.durationMinutes > 480 ? 'Yes' : 'No' // Example OT calculation
    }));
    console.log('73: Last WorkEntries.recordset:', recentEntries.recordset[0], ' out of  WorkEntries ¤ ', WorkEntries.length);
    const clockedIn = activeSession.recordset.length > 0;
    const clockInTime = new Date(recentEntries.recordset[0].LoginTime).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }) ;
    console.log('77: clockedIn status:', clockedIn);
    console.log('LAST clockInTime defined as :', clockInTime);

    res.render('clock-in', {
      title: 'Clock In/Out',
      user: req.session.user,
      clockedIn: clockedIn,
      clockInTime: clockInTime,
      WorkEntries: WorkEntries, 
      templates: templatesResult.recordset
    });
    
  } catch (err) {
    console.error('Database error:', err);
    res.render('clock-in', { 
      title: 'Clock In/Out', 
      user: req.session.user,
      clockedIn: false,
      WorkEntries: [],
      templates: []
    });
  } finally {
    await sql.close();
  }
});

// Clock In - POST
router.post('/clock-in', requireLogin, async function(req, res, next) {
  console.log('POST body:', req.body);
  const { workTemplateID, notes } = req.body;
  console.log('Clock In - POST for user:', req.session.user.userFirstname, 'with ID:', req.session.user.EmployeeId);
  try {
    await sql.connect(dbConfig);
    
    // Check if already clocked in
    const activeSession = await sql.query`
      SELECT * FROM Workreg.Worklog 
      WHERE EmployeeID = ${req.session.user.EmployeeId} 
      AND LogoutTime IS NULL
    `;
    
    if (activeSession.recordset.length > 0) {
      return res.redirect('/clock-in');
    }
    
    // Insert new clock in entry
    await sql.query`
      INSERT INTO Workreg.Worklog (EmployeeID, LoginTime, workTemplateID, notes)
      VALUES (${req.session.user.EmployeeId}, GETDATE(), ${workTemplateID}, ${notes || null})
    `;
    console.log('result of insert :', req.session.user.EmployeeId, workTemplateID, notes);  
    res.redirect('/clock-in');
    
  } catch (err) {
    console.error('Database error:', err);
    res.redirect('/clock-in');
  } finally {
    await sql.close();
  }
});

// Clock Out - POST
router.post('/clock-out', requireLogin, async function(req, res, next) {
  console.log('Clock Out -POST body:', req.body);
  try {
    await sql.connect(dbConfig);
    // Get the active session with template info
    const activeSession = await sql.query`
      SELECT 
        wl.LogID,
        wl.LoginTime,
        wl.workTemplateID,
        wt.DefaultHours
      FROM Workreg.Worklog wl
      INNER JOIN WorkReg.WorkTemplate wt ON wl.workTemplateID = wt.TemplateID
      WHERE wl.EmployeeID = ${req.session.user.EmployeeId} 
      AND wl.LogoutTime IS NULL
    `;
    
    if (activeSession.recordset.length === 0) {
      console.log('No active session found for user');
      return res.redirect('/clock-in');
    }
    
    const session = activeSession.recordset[0];
    const loginTime = new Date(session.LoginTime);
    const logoutTime = new Date();
    
    // Calculate hours worked (in decimal hours)
    const millisecondsWorked = logoutTime - loginTime;
    const hoursWorked = millisecondsWorked / (1000 * 60 * 60);
    
    // Calculate overtime
    const defaultHours = session.DefaultHours || 8; // Default to 8 if null
    const extraTime = Math.max(0, hoursWorked - defaultHours);
    
    console.log('Overtime Calculation:', {
      worklogID: session.WorklogID,
      loginTime: loginTime.toISOString(),
      logoutTime: logoutTime.toISOString(),
      hoursWorked: hoursWorked.toFixed(2),
      defaultHours: defaultHours,
      extraTime: extraTime.toFixed(2)
    });


    // Update the active session with clock out time
    await sql.query`
      UPDATE Workreg.Worklog 
      SET 
        LogoutTime = GETDATE(),
        ExtraTime = ${extraTime.toFixed(2)}
      WHERE EmployeeID = ${req.session.user.EmployeeId} 
      AND LogoutTime IS NULL
    `;
    
    res.redirect('/clock-in');
    
  } catch (err) {
    console.error('Database error:', err);
    res.redirect('/clock-in');
  } finally {
    await sql.close();
  }
});

// Profile page
router.get('/profile', requireLogin, function(req, res, next) {
  res.render('profile', { 
    title: 'Profile', 
    user: req.session.user 
  });
});

// Reports page
router.get('/reports', requireLogin, function(req, res, next) {
  res.render('reports', { 
    title: 'Reports', 
    user: req.session.user 
  });
});

// Work Templates page - GET
router.get('/work-templates', requireLogin, async function(req, res, next) {
  try {
    await sql.connect(dbConfig);
    
    // Get all templates
    const result = await sql.query`
      SELECT 
       *
      FROM 
        WorkReg.WorkTemplate
      ORDER BY TemplateName
    `;
    console.log('loaded templates for user:', req.session.user.userFirstname, 'with ID:', req.session.user.EmployeeId);
    console.log('Number of templates found:', result.recordset.length);
    res.render('work-templates', { 
      title: 'Work Templates', 
      user: req.session.user,
      templates: result.recordset,
      success: req.query.success,
      error: req.query.error
    });
    
  } catch (err) {
    console.error('Database error:', err);
    res.render('templates', { 
      title: 'Work Templates', 
      user: req.session.user,
      templates: [],
      error: 'Failed to load templates'
    });
  } finally {
    await sql.close();
  }
});

// Create new template - POST
router.post('/work-templates/create', requireLogin, async function(req, res, next) {
  const { TemplateName, StartTime, EndTime } = req.body;
  
  try {
    await sql.connect(dbConfig);
    console.log('Creating template with values:', { TemplateName, StartTime, EndTime }  );
    await sql.query`
      INSERT INTO WorkReg.WorkTemplate (TemplateName, StartTime, EndTime)
      VALUES (
        ${TemplateName}, 
        ${StartTime || null}, 
        ${EndTime || null}

      )
    `;
    
    res.redirect('/work-templates?success=Template created successfully');
    
  } catch (err) {
    console.error('Database error:', err);
    res.redirect('/work-templates?error=Failed to create template');
  } finally {
    await sql.close();
  }
});

// Update template - POST
router.post('/work-templates/update', requireLogin, async function(req, res, next) {
  const { TemplateID, TemplateName, StartTime, EndTime } = req.body;
  
  try {
    await sql.connect(dbConfig);
    
    await sql.query`
      UPDATE WorkReg.WorkTemplate 
      SET 
        TemplateName = ${TemplateName},
        StartTime = ${StartTime || null},
        EndTime = ${EndTime || null}
        }
      WHERE TemplateID = ${TemplateID}
    `;

    res.redirect('/work-templates?success=Template updated successfully');

  } catch (err) {
    console.error('Database error:', err);
    res.redirect('/work-templates?error=Failed to update template');
  } finally {
    await sql.close();
  }
});

// Delete template - POST
router.post('/work-templates/delete', requireLogin, async function(req, res, next) {
  const { TemplateID } = req.body;
  
  // Check if user is admin
  if (!req.session.user.isAdmin) {
    return res.redirect('/work-templates?error=Only administrators can delete templates');
  }
  
  try {
    await sql.connect(dbConfig);
    
    await sql.query`
      DELETE FROM WorkReg.WorkTemplate 
      WHERE TemplateID = ${TemplateID}
    `;
    
    res.redirect('/templates?success=Template deleted successfully');
    
  } catch (err) {
    console.error('Database error:', err);
    res.redirect('/templates?error=Failed to delete template');
  } finally {
    await sql.close();
  }
});


// Logout
router.get('/logout', function(req, res, next) {
  req.session.destroy();
  res.redirect('/login');
});


module.exports = router;