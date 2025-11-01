//.app.js
require('dotenv').config();
console.log('DB_SERVER:', process.env.DB_SERVER);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_DATABASE:', process.env.DB_DATABASE);
console.log('DB_PORT:', process.env.DB_PORT);

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');

var app = express();

// view engine setup (BEFORE routes)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Basic middleware (BEFORE routes)
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware (MUST BE BEFORE ROUTES!)
app.use(session({
  secret: process.env.SESSION_SECRET || 'workreg-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 30 * 60 * 1000, // 30 minutes in milliseconds
    rolling: true // Reset maxAge on every request
  }
}));

// Middleware to track last activity and check for timeout
app.use(function(req, res, next) {
  if (req.session && req.session.user) {
    const now = Date.now();
    const lastActivity = req.session.lastActivity || now;
    const timeoutDuration = 30 * 60 * 1000; // 30 minutes
    
    // Check if session has timed out
    if (now - lastActivity > timeoutDuration) {
      req.session.destroy(function(err) {
        return res.redirect('/login?timeout=true');
      });
    } else {
      // Update last activity timestamp
      req.session.lastActivity = now;
      next();
    }
  } else {
    next();
  }
});

// Session debugging (optional - remove in production)
app.use((req, res, next) => {
  console.log('🔍 Session Check:', {
    path: req.path,
    sessionID: req.sessionID,
    hasUser: !!(req.session && req.session.user),
    user: req.session?.user?.userFirstname
  });
  next();
});

// Routes (AFTER session middleware)
var indexRouter = require('./routes/index');
var loginRouter = require('./routes/login');
var dashboardRouter = require('./routes/dashboard');
var clockRouter = require('./routes/clock-in');
var templatesRouter = require('./routes/work-templates');
var profileRouter = require('./routes/profile');
var reportsRouter = require('./routes/reports');

app.use('/', indexRouter);
app.use('/', loginRouter);
app.use('/', dashboardRouter);
app.use('/', clockRouter);
app.use('/', templatesRouter);
app.use('/', profileRouter);
app.use('/', reportsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});
const { closePool } = require('./config/database');

process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await closePool();
  process.exit(0);
});

module.exports = app;