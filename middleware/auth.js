// middleware/auth.js
function requireLogin(req, res, next) {
  console.log('🔒 Authentication check...');
  console.log('🔒 Current session:', req.session);
  if (!req.session || !req.session.user) {
    console.warn('⚠️ Unauthorized access attempt – no session user found.');
    return res.redirect('/login');
  }
  next();
}

module.exports = { requireLogin };

