// routes/work-templates.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');
const dbConfig = require('../config/srvazure');
const { requireLogin } = require('../middleware/auth');

// Work Templates - GET
router.get('/work-templates', requireLogin, async (req, res) => {
  try {
    await sql.connect(dbConfig);
    const result = await sql.query`
      SELECT * FROM WorkReg.WorkTemplate ORDER BY TemplateName
    `;
    console.log('Loaded templates for user:', req.session.user.userFirstname, 'ID:', req.session.user.EmployeeId);
    res.render('work-templates', { 
      title: 'Work Templates', 
      user: req.session.user,
      templates: result.recordset,
      success: req.query.success,
      error: req.query.error
    });
  } catch (err) {
    console.error('Database error:', err);
    res.render('work-templates', { 
      title: 'Work Templates', 
      user: req.session.user,
      templates: [],
      error: 'Failed to load templates'
    });
  } finally {
    await sql.close();
  }
});

// Create template
router.post('/work-templates/create', requireLogin, async (req, res) => {
  const { TemplateName, StartTime, EndTime } = req.body;
  try {
    await sql.connect(dbConfig);
    console.log('Creating template:', { TemplateName, StartTime, EndTime });
    await sql.query`
      INSERT INTO WorkReg.WorkTemplate (TemplateName, StartTime, EndTime)
      VALUES (${TemplateName}, ${StartTime || null}, ${EndTime || null})
    `;
    res.redirect('/work-templates?success=Template created successfully');
  } catch (err) {
    console.error('Database error:', err);
    res.redirect('/work-templates?error=Failed to create template');
  } finally {
    await sql.close();
  }
});

// Update template
router.post('/work-templates/update', requireLogin, async (req, res) => {
  const { TemplateID, TemplateName, StartTime, EndTime } = req.body;
  try {
    await sql.connect(dbConfig);
    await sql.query`
      UPDATE WorkReg.WorkTemplate 
      SET 
        TemplateName = ${TemplateName},
        StartTime = ${StartTime || null},
        EndTime = ${EndTime || null}
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

// Delete template
router.post('/work-templates/delete', requireLogin, async (req, res) => {
  const { TemplateID } = req.body;
  if (!req.session.user.isAdmin) {
    return res.redirect('/work-templates?error=Only administrators can delete templates');
  }
  try {
    await sql.connect(dbConfig);
    await sql.query`
      DELETE FROM WorkReg.WorkTemplate WHERE TemplateID = ${TemplateID}
    `;
    res.redirect('/work-templates?success=Template deleted successfully');
  } catch (err) {
    console.error('Database error:', err);
    res.redirect('/work-templates?error=Failed to delete template');
  } finally {
    await sql.close();
  }
});

module.exports = router;
