const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { requireLogin } = require('../middleware/auth');
const dbConfig = require('../config/srvazure');
const multer = require('multer');
const { parse } = require('csv-parse/sync');

const upload = multer({ storage: multer.memoryStorage() });

const monthNames = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const getWeekDay = isoDate => weekDays[new Date(isoDate).getDay()];
function pad2(n) {
  return String(n).padStart(2, '0');
}

function minutesToHHMM(mins) {
  if (mins == null) return '00:00';
  const m = Math.max(0, Math.round(Number(mins)));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return pad2(h) + ':' + pad2(r);
}

function toDisplayTime(t) {
  if (!t) return '';
  try {
    if (t instanceof Date) {
      return pad2(t.getHours()) + ':' + pad2(t.getMinutes());
    }
    const s = String(t);
    if (s.includes(':')) {
      const parts = s.split(':');
      return pad2(Number(parts[0])) + ':' + pad2(Number(parts[1] || 0));
    }
    return s;
  } catch (e) {
    return String(t);
  }
}


router.post('/reports/update/:logid', requireLogin, async (req, res) => {
  const { logid } = req.params;
  const { loginTime, logoutTime, notes, templateID } = req.body;
  if (!logid) return res.status(400).json({ success: false, error: 'Missing log id' });

  let connection;
  try {
    connection = await sql.connect(dbConfig);
    console.log('updating....');
     // Fetch original row in case templateID wasn't provided
    const origRes = await connection.request()
      .input('logid', sql.Int, logid)
      .query('SELECT workTemplateID FROM WorkReg.WorkLog WHERE LogID = @logid');

    if (!origRes.recordset || origRes.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Log entry not found' });
    }
     const currentTemplateID = templateID || origRes.recordset[0].workTemplateID || null;

    // Parse and build Date objects for login/logout
    // Expecting loginTime/logoutTime to be time strings "HH:MM" (same date as WorkDate)
    // If client sends full DateTime strings instead, adjust parsing accordingly.
    const loginDT = loginTime ? new Date(loginTime) : null;
    const logoutDT = logoutTime ? new Date(logoutTime) : null;

    // If login/logout are provided as time-only (e.g., "09:00"), we need WorkDate to construct times.
    // Try reading WorkDate from DB if provided times are short (no 'T' present)
    let usedLogin = loginDT;
    let usedLogout = logoutDT;
    if (loginTime && typeof loginTime === 'string' && !loginTime.includes('T')) {
      // fetch WorkDate from DB
      const wdRes = await connection.request()
        .input('logid', sql.Int, logid)
        .query('SELECT WorkDate FROM WorkReg.WorkLog WHERE LogID = @logid');
      const workDateRow = wdRes.recordset && wdRes.recordset[0];
      const workDate = workDateRow ? (new Date(workDateRow.WorkDate)) : new Date(); // fallback to today
      usedLogin = new Date(`${workDate.toISOString().split('T')[0]}T${loginTime}`);
    }
    if (logoutTime && typeof logoutTime === 'string' && !logoutTime.includes('T')) {
      const wdRes2 = await connection.request()
        .input('logid', sql.Int, logid)
        .query('SELECT WorkDate FROM WorkReg.WorkLog WHERE LogID = @logid');
      const workDateRow2 = wdRes2.recordset && wdRes2.recordset[0];
      const workDate2 = workDateRow2 ? (new Date(workDateRow2.WorkDate)) : new Date();
      usedLogout = new Date(`${workDate2.toISOString().split('T')[0]}T${logoutTime}`);
    }

    // Compute worked minutes if both login+logout present
    let workedMinutes = null;
    if (usedLogin && usedLogout && !isNaN(usedLogin.getTime()) && !isNaN(usedLogout.getTime())) {
      workedMinutes = Math.max(0, Math.round((usedLogout - usedLogin) / 60000));
    }
    console.log('worked minutes calculated');
    // Fetch default hours for the template (if any)
    let defaultMinutes = 0;
    if (currentTemplateID) {
      const tmplRes = await connection.request()
        .input('tid', sql.Int, currentTemplateID)
        .query('SELECT DefaultHours FROM WorkReg.WorkTemplate WHERE TemplateID = @tid');
      if (tmplRes.recordset && tmplRes.recordset.length > 0) {
        defaultMinutes = Math.round((Number(tmplRes.recordset[0].DefaultHours) || 0) * 60);
      }
    }

    // If workedMinutes computed, calculate extraMinutes; otherwise leave as NULL (or 0)
    const extraMinutes = (workedMinutes != null) ? Math.max(0, workedMinutes - defaultMinutes) : null;
    console.log('extraminutes calculated:' + extraMinutes);
    const extraHH = extraMinutes/60;
    // Build update query - update TotalWorkedHours and ExtraTime if we computed them
    const reqBuilder = connection.request()
      .input('logid', sql.Int, logid)
      .input('loginTime', sql.DateTime, usedLogin || null)
      .input('logoutTime', sql.DateTime, usedLogout || null)
      .input('notes', sql.NVarChar, notes || '')
      .input('workTemplateID', sql.Int, currentTemplateID || null);
    console.log('update sql...Extra is:'+ extraHH);
    let updateSql;
    if (workedMinutes != null) {
      reqBuilder.input('totalWorkedMinutes', sql.Float, workedMinutes)
                .input('extraHH', sql.Float, extraHH);

      updateSql = `
        UPDATE WorkReg.WorkLog
        SET 
          LoginTime = @loginTime,
          LogoutTime = @logoutTime,
          notes = @notes,
          workTemplateID = @workTemplateID,
          ExtraTime = @extraHH
        WHERE LogID = @logid
      `;
    } else {
      // no worked minutes calculated - update only provided fields
      updateSql = `
        UPDATE WorkReg.WorkLog
        SET 
          LoginTime = @loginTime,
          LogoutTime = @logoutTime,
          notes = @notes,
          workTemplateID = @workTemplateID
        WHERE LogID = @logid
      `;
    }

    await reqBuilder.query(updateSql);

    res.json({ success: true, workedMinutes, extraMinutes });
  } catch (err) {
    console.error('Error updating log (recalc):', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (_) {}
    }
  }
});
// ============================================
// CSV PREVIEW ROUTE - MUST BE BEFORE /reports
// ============================================
router.post('/reports/preview-csv', requireLogin, upload.single('csvfile'), async (req, res) => {
  console.log('=== CSV Preview Route Hit ===');
  console.log('User:', req.session.user?.EmployeeID);
  console.log('Is Admin:', req.session.user?.isAdmin);
  console.log('File received:', req.file ? 'Yes' : 'No');
  
  if (!req.session.user.isAdmin) {
    console.log('ERROR: Unauthorized - user is not admin');
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  if (!req.file) {
    console.log('ERROR: No file uploaded');
    return res.status(400).json({ error: 'No CSV file uploaded' });
  }

  try {
    const csvText = req.file.buffer.toString('utf-8');
    console.log('CSV content length:', csvText.length);
    console.log('First 200 chars:', csvText.substring(0, 200));
    
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ',',
      bom: true  // Handle BOM if present
    });
    
    console.log(`Parsed ${records.length} records from CSV`);
    if (records.length > 0) {
      console.log('First record:', JSON.stringify(records[0]));
      console.log('Column headers:', Object.keys(records[0]));
    }
    
    // Transform records for preview
    const preview = records.map((row, index) => {
      const { Dato, Start, Slutt, Aktivitet } = row;
      
      console.log(`Processing record ${index}:`, { Dato, Start, Slutt, Aktivitet });
      
      if (!Dato || !Start || !Slutt) {
        return {
          index,
          valid: false,
          error: 'Missing required fields',
          date: Dato || '',
          start: Start || '',
          end: Slutt || '',
          activity: Aktivitet || ''
        };
      }
      
      try {
        const dateParts = Dato.split('.');
        if (dateParts.length !== 3) {
          throw new Error('Date must be in format DD.MM.YYYY');
        }
        
        const [day, month, year] = dateParts;
        if (!day || !month || !year) {
          throw new Error('Invalid date parts');
        }
        
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        // Validate time format (HH:MM)
        const timeRegex = /^\d{1,2}:\d{2}$/;
        if (!timeRegex.test(Start) || !timeRegex.test(Slutt)) {
          throw new Error('Time must be in format HH:MM');
        }
        
        return {
          index,
          valid: true,
          date: Dato,
          isoDate,
          start: Start,
          end: Slutt,
          activity: Aktivitet || ''
        };
      } catch (err) {
        console.error(`Error parsing record ${index}:`, err.message, row);
        return {
          index,
          valid: false,
          error: err.message || 'Invalid format',
          date: Dato || '',
          start: Start || '',
          end: Slutt || '',
          activity: Aktivitet || ''
        };
      }
    });
    
    const validCount = preview.filter(r => r.valid).length;
    const invalidCount = preview.length - validCount;
    
    console.log(`Preview complete - Valid: ${validCount}, Invalid: ${invalidCount}`);
    
    const response = {
      success: true,
      totalRecords: records.length,
      validRecords: validCount,
      invalidRecords: invalidCount,
      preview
    };
    
    console.log('Sending JSON response');
    res.json(response);
  } catch (err) {
    console.error('CSV preview error:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ error: 'Failed to preview CSV: ' + err.message });
  }
});

// ============================================
// CONFIRM IMPORT ROUTE
// ============================================
router.post('/reports/import-confirmed', requireLogin, async (req, res) => {
  console.log('=== Import Confirmed Route Hit ===');
  
  if (!req.session.user.isAdmin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { records } = req.body;
  
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'No records to import' });
  }

  let connection;
  try {
    console.log(`Importing ${records.length} confirmed records`);
    connection = await sql.connect(dbConfig);
    
    let imported = 0;
    let failed = 0;
    const errors = [];
    
    for (const record of records) {
      if (!record.valid) continue;
      
      try {
        const { isoDate, start, end, activity } = record;
        const login = new Date(`${isoDate}T${start}`);
        const logout = new Date(`${isoDate}T${end}`);

        await connection.request()
          .input('employeeID', sql.Int, req.session.user.EmployeeID)
          .input('workDate', sql.DateTime, new Date(isoDate))
          .input('loginTime', sql.DateTime, login)
          .input('logoutTime', sql.DateTime, logout)
          .input('workTemplateID', sql.Int, 2)
          .input('notes', sql.NVarChar, activity || '')
          .input('extraTime', sql.Float, 0)
          .query(`
            INSERT INTO WorkReg.WorkLog (EmployeeID, WorkDate, LoginTime, LogoutTime, workTemplateID, notes, ExtraTime)
            VALUES (@employeeID, @workDate, @loginTime, @logoutTime, @workTemplateID, @notes, @extraTime)
          `);
        
        imported++;
        console.log(`Imported record ${record.index + 1}`);
      } catch (err) {
        console.error(`Failed to import record ${record.index}:`, err);
        failed++;
        errors.push(`Record ${record.index + 1}: ${err.message}`);
      }
    }

    console.log(`Import complete - Imported: ${imported}, Failed: ${failed}`);
    
    res.json({ 
      success: true, 
      imported, 
      failed,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${imported} records.${failed > 0 ? ` ${failed} failed.` : ''}`
    });
  } catch (err) {
    console.error('CSV import error:', err);
    res.status(500).json({ error: 'Failed to import CSV: ' + err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (_) {}
    }
  }
});

router.delete('/reports/delete/:logid', requireLogin, async (req, res) => {
  const logid = parseInt(req.params.logid);
  if (isNaN(logid)) return res.status(400).json({ error: 'Invalid log ID' });

  let connection;
  try {
    connection = await sql.connect(dbConfig);
    console.log('Deleting log entry ID:', logid, '- user lvl:', req.session.user.isAdmin);
    await connection.request()
      .input('logid', sql.Int, logid)
      .input('employeeID', sql.Int, req.session.user.EmployeeID)
      .query(`
        DELETE FROM WorkReg.WorkLog
        WHERE LogID = @logid AND EmployeeID = @employeeID
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting log entry:', err);
    res.status(500).json({ error: 'Failed to delete entry' });
  } finally {
    if (connection) await connection.close();
  }
});

router.post('/reports/add', requireLogin, async (req, res) => {
  if (!req.session.user.isAdmin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
console.log('383:defines new record for user:', req.session.user.EmployeeID);
  const { WorkDate, LoginTime, LogoutTime, TemplateID, Notes, ExtraTime } = req.body;
  if (!WorkDate || !LoginTime || !LogoutTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
console.log('388:Adding record for user:', req.session.user.EmployeeID);
  let connection;
  try {
    connection = await sql.connect(dbConfig);

    await connection.request()
      .input('employeeID', sql.Int, req.session.user.EmployeeID)
      .input('workDate', sql.DateTime, new Date(WorkDate))
      .input('loginTime', sql.DateTime, new Date(`${WorkDate}T${LoginTime}`))
      .input('logoutTime', sql.DateTime, new Date(`${WorkDate}T${LogoutTime}`))
      .input('workTemplateID', sql.Int, TemplateID || null)
      .input('notes', sql.NVarChar, Notes || '')
      .input('extraTime', sql.Float, ExtraTime || 0)
      .query(`
        INSERT INTO WorkReg.WorkLog (EmployeeID, WorkDate, LoginTime, LogoutTime, workTemplateID, notes, ExtraTime)
        VALUES (@employeeID, @workDate, @loginTime, @logoutTime, @workTemplateID, @notes, @extraTime)
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('386 Error adding record:', err);
    res.status(500).json({ error: 'Failed to add record' });
  } finally {
    if (connection) await connection.close();
  }
});

router.post('/reports/import', requireLogin, upload.single('csvfile'), async (req, res) => {
  if (!req.session.user.isAdmin) {
    return res.status(403).send('Unauthorized');
  }
  if (!req.file) {
    return res.status(400).send('No CSV file uploaded');
  }
  console.log('starting import');
  try {
    const csvText = req.file.buffer.toString('utf-8');
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ','
    });
    console.log(`Importing ${records.length} records from CSV`);
    const connection = await sql.connect(dbConfig);
    for (const row of records) {
      const { Dato, Start, Slutt, Aktivitet } = row;
      if (!Dato || !Start || !Slutt) continue;
      console.log(`Importing record: ${Dato}, ${Start}, ${Slutt}, ${Aktivitet}`);
      // Konverter CSV-format til ISO-dato
      const [day, month, year] = Dato.split('.');
      const isoDate = `${year}-${month}-${day}`;
      const login = new Date(`${isoDate}T${Start}`);
      const logout = new Date(`${isoDate}T${Slutt}`);

      await connection.request()
        .input('employeeID', sql.Int, req.session.user.EmployeeID)
        .input('workDate', sql.DateTime, new Date(isoDate))
        .input('loginTime', sql.DateTime, login)
        .input('logoutTime', sql.DateTime, logout)
        .input('workTemplateID', sql.NVarChar, '2')
        .input('notes', sql.NVarChar, 'imported')
        .query(`
          INSERT INTO WorkReg.WorkLog (EmployeeID, WorkDate, LoginTime, LogoutTime, workTemplateID, notes, ExtraTime)
          VALUES (@employeeID, @workDate, @loginTime, @logoutTime, @workTemplateID, @notes, @extraTime)
        `);
    }

    await connection.close();
    res.status(200).send('Import successful');
  } catch (err) {
    console.error('CSV import error:', err);
    res.status(500).send('Failed to import CSV: ' + err.message);
  }
});

router.get('/reports', requireLogin, async (req, res, next) => {

  let connection;
  try {
    const now = new Date();
    const qMonth = Number(req.query.month) || (now.getMonth() + 1);
    const qYear = Number(req.query.year) || now.getFullYear();

    console.log('Creating fresh database connection...');
    connection = await sql.connect(dbConfig);
    console.log('Connection established');

    // Compute first/last day for the month range
    const startDate = new Date(qYear, qMonth - 1, 1)+1;
    const endDate = new Date(qYear, qMonth , 0 , 23, 59) ;

    console.log(`Date range: ${startDate} to ${endDate}`);
    console.log('Executing query..End date: ' + endDate);
    const result = await connection.request()
      .input('employeeID', sql.Int, req.session.user.EmployeeID)
      .input('startDate', sql.DateTime, startDate)
      .input('endDate', sql.DateTime, endDate)
      .query(`
        SELECT
          LogID,
          EmployeeID,
          WorkDate,
          LoginTime,
          LogoutTime,
          DATEDIFF(MINUTE, LoginTime, LogoutTime) AS durationMinutes,
          workTemplateID,
          notes,
          ExtraTime
        FROM WorkReg.WorkLog
        WHERE EmployeeID = @employeeID
          AND WorkDate >= @startDate
          AND WorkDate <= @endDate
        ORDER BY WorkDate ASC, LoginTime ASC
      `);

    console.log(`Found ${result.recordset.length} records`);
    const rows = result.recordset || [];

    // Group entries by day string and compute totals
    const byDay = new Map();
    let monthWorkMinutes = 0;
    let monthExtraMinutes = 0;

    rows.forEach(r => {
      const d = new Date(r.WorkDate);
      const dayKey = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());

      const login = toDisplayTime(r.LoginTime);
      const logout = toDisplayTime(r.LogoutTime);

      const workedMinutes = Number(r.durationMinutes);
      console.log('Worked minutes for log ID', r.LogID, ':', workedMinutes);
      const extraMinutes = Number(r.ExtraTime * 60); // Convert hours to minutes
      console.log('Extra minutes for log ID', r.LogID, ':', extraMinutes);

      monthWorkMinutes += workedMinutes;
      monthExtraMinutes += extraMinutes;
      console.log('Total month extra minutes logged:', monthExtraMinutes);

      const entry = {
        logid: r.LogID,
        dateISO: dayKey,
        loginTime: login,
        logoutTime: logout,
        totalWorked: workedMinutes? minutesToHHMM(workedMinutes) : '',
        workTemplateID: r.workTemplateID,
        notes: r.notes || '',
        extraTime: extraMinutes? minutesToHHMM(extraMinutes) : ''
    };

      if (!byDay.has(dayKey)) {
        byDay.set(dayKey, {
          dateISO: dayKey,
          entries: [],
          dayWorkMinutes: 0,
          dayExtraMinutes: 0
        });
      }
      const bucket = byDay.get(dayKey);
      bucket.entries.push(entry);
      bucket.dayWorkMinutes += workedMinutes;
      bucket.dayExtraMinutes += extraMinutes;
    });

    const reportEntries = Array.from(byDay.values())
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
      .map(d => ({
        dateISO: d.dateISO,
        entries: d.entries,
        totalDayHours: minutesToHHMM(d.dayWorkMinutes),
        totalDayExtra: minutesToHHMM(d.dayExtraMinutes)
      }));

    const summary = {
      totalHours: minutesToHHMM(monthWorkMinutes),
      totalOT: minutesToHHMM(monthExtraMinutes)
    };

    const monthData = {};
    monthData[qMonth] = {
      totalHours: summary.totalHours,
      totalOT: summary.totalOT
    };

    // Fetch available years
    console.log('Fetching available years...');
    const yearsRes = await connection.request()
      .input('employeeID', sql.Int, req.session.user.EmployeeID)
      .query(`
        SELECT DISTINCT YEAR(WorkDate) AS y
        FROM WorkReg.WorkLog
        WHERE EmployeeID = @employeeID
        ORDER BY y DESC
      `);
    
    const availableYears = (yearsRes.recordset || []).map(r => r.y);
    
    // If no years found, at least show current year
    if (availableYears.length === 0) {
      availableYears.push(qYear);
    }
    
    console.log('Available years:', availableYears);
    // Fetch Work Templates for dropdown
    let workTemplates = [];
    const templatesRes = await connection.request().query(`
        SELECT TemplateID, TemplateName, DefaultHours
        FROM WorkReg.WorkTemplate
        ORDER BY TemplateName ASC
      `);
      workTemplates = templatesRes.recordset || [];
    console.log('Work templates fetched:', workTemplates.length);
    console.log('Define weekday');
    reportEntries.forEach(day => {
      day.weekDay = new Date(day.dateISO).toLocaleDateString('en-GB', { weekday: 'short' });
    });

    
    res.render('reports', {
      months: monthNames,
      currentYear: qYear,
      availableYears,
      selectedMonth: qMonth,
      reportEntries,
      summary,
      monthData,
      workTemplates: workTemplates,
      user: req.session.user,
      useradminlvl: req.session.user.userAdminLvl
    });
  } catch (err) {
    console.error('Error in reports route:', err);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    
    res.status(500).render('error', {
      message: 'Unable to load reports',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  } finally {
    // Always close the connection
    if (connection) {
      try {
        await connection.close();
        console.log('Connection closed');
      } catch (closeErr) {
        console.error('Error closing connection:', closeErr);
      }
    }
  }
});

module.exports = router;