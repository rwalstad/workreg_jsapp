// routes/clock-in.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');
const dbConfig = require('../config/srvazure');
const { requireLogin } = require('../middleware/auth');

// Clock In page - GET
router.get('/clock-in', requireLogin, async (req, res) => {
  try {
    await sql.connect(dbConfig);
    console.log('getting worklog for user:', req.session.user.userFirstname, 'with ID:', req.session.user.EmployeeID);

    const activeSession = await sql.query`
      SELECT TOP 1 * FROM Workreg.Worklog 
      WHERE EmployeeID = ${req.session.user.EmployeeID} 
      AND LogoutTime IS NULL
      ORDER BY LoginTime DESC
    `;
    console.log('ACTIVES CHECKED for STATUS OF clock-in:', activeSession.recordset.length);

    const templatesResult = await sql.query`
      SELECT TemplateID, TemplateName
      FROM WorkReg.WorkTemplate
      ORDER BY TemplateName
    `;
    console.log('Templates for clock-in:', templatesResult.recordset);

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
      WHERE EmployeeID = ${req.session.user.EmployeeID}
      ORDER BY LoginTime DESC
    `;
    console.log('Recent entries length:', recentEntries.recordset.length);

    const WorkEntries = recentEntries.recordset.map(entry => ({
      WorkDate: new Date(entry.WorkDate).toLocaleDateString('en-GB'),
      clockInTime: new Date(entry.LoginTime).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      clockOutTime: entry.LogoutTime ? new Date(entry.LogoutTime).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }) : null,
      duration: entry.durationMinutes ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m` : null,
      template: entry.workTemplateID,
      notes: entry.notes,
      ot: entry.durationMinutes > 480 ? 'Yes' : 'No'
    }));

    const clockedIn = activeSession.recordset.length > 0;
    const clockInTime = recentEntries.recordset[0]
      ? new Date(recentEntries.recordset[0].LoginTime).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })
      : null;

    res.render('clock-in', {
      title: 'Clock In/Out',
      user: req.session.user,
      clockedIn,
      clockInTime,
      WorkEntries,
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
router.post('/clock-in', requireLogin, async (req, res) => {
  console.log('POST body:', req.body);
  const { workTemplateID, notes } = req.body;
  console.log('Clock In - POST for user:', req.session.user.userFirstname, 'with ID:', req.session.user.EmployeeID);
  try {
    await sql.connect(dbConfig);

    const activeSession = await sql.query`
      SELECT * FROM Workreg.Worklog 
      WHERE EmployeeID = ${req.session.user.EmployeeID} 
      AND LogoutTime IS NULL
    `;
    
    if (activeSession.recordset.length > 0) {
      return res.redirect('/clock-in');
    }

    await sql.query`
      INSERT INTO Workreg.Worklog (EmployeeID, LoginTime, workTemplateID, notes)
      VALUES (${req.session.user.EmployeeID}, GETDATE(), ${workTemplateID}, ${notes || null})
    `;
    console.log('Inserted clock-in for:', req.session.user.EmployeeID, workTemplateID, notes);
    res.redirect('/clock-in');
    
  } catch (err) {
    console.error('Database error:', err);
    res.redirect('/clock-in');
  } finally {
    await sql.close();
  }
});

// Clock Out - POST
router.post('/clock-out', requireLogin, async (req, res) => {
  console.log('Clock Out - POST body:', req.body);
  try {
    await sql.connect(dbConfig);

    const activeSession = await sql.query`
      SELECT 
        wl.LogID,
        wl.LoginTime,
        wl.workTemplateID,
        wt.DefaultHours
      FROM Workreg.Worklog wl
      INNER JOIN WorkReg.WorkTemplate wt ON wl.workTemplateID = wt.TemplateID
      WHERE wl.EmployeeID = ${req.session.user.EmployeeID} 
      AND wl.LogoutTime IS NULL
    `;
    
    if (activeSession.recordset.length === 0) {
      console.log('No active session found for user');
      return res.redirect('/clock-in');
    }
    
    const session = activeSession.recordset[0];
    const loginTime = new Date(session.LoginTime);
    const logoutTime = new Date();
    const millisecondsWorked = logoutTime - loginTime;
    const hoursWorked = millisecondsWorked / (1000 * 60 * 60);
    const defaultHours = session.DefaultHours || 8;
    const extraTime = Math.max(0, hoursWorked - defaultHours);
    
    console.log('Overtime Calculation:', {
      worklogID: session.WorklogID,
      loginTime: loginTime.toISOString(),
      logoutTime: logoutTime.toISOString(),
      hoursWorked: hoursWorked.toFixed(2),
      defaultHours: defaultHours,
      extraTime: extraTime.toFixed(2)
    });

    await sql.query`
      UPDATE Workreg.Worklog 
      SET 
        LogoutTime = GETDATE(),
        ExtraTime = ${extraTime.toFixed(2)}
      WHERE EmployeeID = ${req.session.user.EmployeeID} 
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

module.exports = router;
