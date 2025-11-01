//Fixed reports.js
//Code ∙ Version 7

const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/database');
const { requireLogin } = require('../middleware/auth');

const monthNames = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

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

router.get('/reports', requireLogin, async (req, res, next) => {
  let pool;
  try {
    const now = new Date();
    const qMonth = Number(req.query.month) || (now.getMonth() + 1);
    const qYear = Number(req.query.year) || now.getFullYear();

    console.log('Getting database pool...');
    pool = await getPool();
    console.log('Pool obtained, connected:', pool.connected);

    // Double-check connection before proceeding
    if (!pool.connected) {
      console.log('Pool not connected, forcing reconnection...');
      pool = await getPool();
    }

    // Compute first/last day for the month range
    const startDate = new Date(qYear, qMonth - 1, 1);
    const endDate = new Date(qYear, qMonth, 0);

    console.log(`Fetching report for user ID ${req.session.user.EmployeeID} from ${startDate} to ${endDate}`);

    // Create request and add all inputs before querying
    const request = pool.request();
    request.input('employeeID', sql.Int, req.session.user.EmployeeID);
    request.input('startDate', sql.DateTime, startDate);
    request.input('endDate', sql.DateTime, endDate);

    console.log('pool created w/End date:', endDate);
    const result = await request.query(`
      SELECT
        LogID,
        EmployeeID,
        WorkDate,
        LoginTime,
        LogoutTime,
        TotalWorkedHours,
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

      const workedMinutes = Number(r.TotalWorkedHours || 0);
      const extraMinutes = Number(r.ExtraTime || 0);

      monthWorkMinutes += workedMinutes;
      monthExtraMinutes += extraMinutes;

      const entry = {
        logid: r.LogID,
        dateISO: dayKey,
        loginTime: login,
        logoutTime: logout,
        totalWorked: minutesToHHMM(workedMinutes),
        workTemplateID: r.workTemplateID,
        notes: r.notes || '',
        extraTime: minutesToHHMM(extraMinutes)
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
    const yearsRequest = pool.request();
    yearsRequest.input('employeeID', sql.Int, req.session.user.EmployeeID);
    
    const yearsRes = await yearsRequest.query(`
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

    res.render('reports', {
      months: monthNames,
      currentYear: qYear,
      availableYears,
      selectedMonth: qMonth,
      reportEntries,
      summary,
      monthData
    });
  } catch (err) {
    console.error('Error in reports route:', err);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    
    // Send a user-friendly error page
    res.status(500).render('error', {
      message: 'Unable to load reports',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

module.exports = router;