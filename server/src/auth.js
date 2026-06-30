import crypto from 'node:crypto';

// Optional HTTP Basic Auth. Enabled only when APP_PASSWORD is set, so the app
// stays zero-config for local dev but can be locked down on a public domain.
const USER = process.env.APP_USER || 'escape';
const PASS = process.env.APP_PASSWORD || '';

export const authEnabled = PASS.length > 0;

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function basicAuth(req, res, next) {
  if (!authEnabled) return next();
  // Allow the health check through so Docker/Dokploy can probe the container.
  if (req.method === 'GET' && req.path === '/api/health') return next();

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    const user = decoded.slice(0, idx);
    const pass = decoded.slice(idx + 1);
    // Bitwise & (not &&) so both comparisons always run — no early-exit timing leak.
    if (safeEqual(user, USER) & safeEqual(pass, PASS)) return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Escape Room Tracker", charset="UTF-8"');
  return res.status(401).json({ error: 'Authentifizierung erforderlich' });
}
