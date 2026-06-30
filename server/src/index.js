import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { PORT, UPLOAD_DIR } from './config.js';
import './db.js';
import { seedIfEmpty } from './seed.js';
import { basicAuth, authEnabled } from './auth.js';
import roomsRouter from './routes/rooms.js';
import statsRouter from './routes/stats.js';
import backupRouter from './routes/backup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const seedResult = seedIfEmpty();
console.log('[seed]', seedResult);

const app = express();
app.disable('x-powered-by');
app.use(basicAuth); // no-op unless APP_PASSWORD is set
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/rooms', roomsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/backup', backupRouter);

// User-uploaded photos (hashed filenames -> safe to cache hard).
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true, fallthrough: false })
);

// In production the built client is copied to ../public (see Dockerfile).
const clientDist = path.join(__dirname, '..', 'public');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback for client-side navigation. Missing hashed assets must 404
  // rather than return index.html (which would mask version/cache drift).
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/assets')
    ) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// JSON error handler (e.g. multer file-too-large).
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Bild ist zu groß (max. 15 MB)' });
  }
  if (err && err.message === 'UNSUPPORTED_TYPE') {
    return res.status(415).json({ error: 'Nur Bilddateien werden unterstützt' });
  }
  console.error(err);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

app.listen(PORT, () => {
  console.log(`🔓 Escape Room Tracker läuft auf Port ${PORT}`);
  console.log(
    authEnabled
      ? '[auth] Basic-Auth aktiv (APP_PASSWORD gesetzt)'
      : '[auth] WARNUNG: kein APP_PASSWORD gesetzt – App ist offen zugänglich!'
  );
});
