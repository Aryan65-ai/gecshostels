import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    req.user = { id: payload.id, email: payload.email, role: payload.role || 'student' };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(requiredRole) {
  return function roleGuard(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (req.user.role !== requiredRole) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
