// src/middleware/authMiddleware.js

export function ensureAuthenticated(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login"); // not logged in
  }
  next();
}

export function ensureRole(role) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    if (req.session.user.role !== role) {
      return res.status(403).send("❌ Access denied: wrong role");
    }
    next();
  };
}
