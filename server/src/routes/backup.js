import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const MAX_IMPORT_ROOMS = 10000;
// Only filenames the app itself produces (randomUUID() + '.jpg') are accepted,
// so a crafted backup can never inject a path or a traversal sequence.
const SAFE_PHOTO = /^[0-9a-f-]{36}\.jpg$/i;

// GET /api/backup/export -> downloadable JSON of all room metadata.
// Note: photo *files* live in the /data/uploads volume; this export keeps the
// filenames so a restore stays linked as long as the volume is intact.
router.get('/export', (_req, res) => {
  const rooms = db
    .prepare(
      `SELECT name, provider, location, country, played_on, notes, photo, printed
       FROM rooms ORDER BY id`
    )
    .all()
    .map((r) => ({ ...r, printed: !!r.printed }));

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="escaperooms-backup.json"');
  res.send(
    JSON.stringify({ app: 'escaperoom-tracker', version: 1, rooms }, null, 2)
  );
});

// POST /api/backup/import  body: { mode?: 'replace'|'merge', rooms: [...] }
router.post('/import', (req, res) => {
  const body = req.body || {};
  const rooms = Array.isArray(body) ? body : body.rooms;
  if (!Array.isArray(rooms)) {
    return res.status(400).json({ error: 'Erwartet wird ein JSON mit "rooms": [...]' });
  }
  if (rooms.length > MAX_IMPORT_ROOMS) {
    return res.status(400).json({ error: `Zu viele Räume (max. ${MAX_IMPORT_ROOMS})` });
  }
  const mode = body.mode === 'replace' ? 'replace' : 'merge';

  const insert = db.prepare(
    `INSERT INTO rooms (name, provider, location, country, played_on, notes, photo, printed)
     VALUES (@name, @provider, @location, @country, @played_on, @notes, @photo, @printed)`
  );

  const run = db.transaction((items) => {
    if (mode === 'replace') db.prepare('DELETE FROM rooms').run();
    let imported = 0;
    for (const r of items) {
      const name = (r.name || '').trim();
      if (!name) continue;
      const playedOn = typeof r.played_on === 'string' ? r.played_on.trim() : '';
      const photo = typeof r.photo === 'string' && SAFE_PHOTO.test(r.photo.trim())
        ? r.photo.trim()
        : null;
      insert.run({
        name,
        provider: (r.provider || '').trim(),
        location: (r.location || '').trim(),
        country: (r.country || '').trim(),
        played_on: /^\d{4}-\d{2}-\d{2}$/.test(playedOn) ? playedOn : null,
        notes: (r.notes || '').trim(),
        photo,
        printed: r.printed ? 1 : 0,
      });
      imported += 1;
    }
    return imported;
  });

  const imported = run(rooms);
  const total = db.prepare('SELECT COUNT(*) AS c FROM rooms').get().c;
  res.json({ ok: true, mode, imported, total });
});

export default router;
