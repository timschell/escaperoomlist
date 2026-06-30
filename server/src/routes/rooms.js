import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { db } from '../db.js';
import { UPLOAD_DIR, MAX_UPLOAD_BYTES } from '../config.js';

const router = Router();
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('UNSUPPORTED_TYPE'));
  },
});

const TEXT_FIELDS = ['name', 'provider', 'location', 'country', 'notes'];

// Forwards rejected promises from async handlers to the Express error middleware
// (Express 4 does not do this automatically).
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Resolve a stored photo value to a path INSIDE the upload dir, or null if the
// value tries to escape it (defense against tainted DB values from import).
function uploadPath(name) {
  if (!name) return null;
  const base = path.basename(name);
  if (base !== name) return null; // contained a path separator / traversal
  return path.join(UPLOAD_DIR, base);
}

function serialize(row) {
  if (!row) return row;
  return {
    ...row,
    printed: !!row.printed,
    photoUrl: row.photo ? `/uploads/${row.photo}` : null,
  };
}

function getRoom(id) {
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
}

// Accepts '', null, or 'YYYY-MM-DD'. Returns {ok, value} or {ok:false}.
function normaliseDate(value) {
  if (value === undefined) return { ok: true, skip: true };
  if (value === null || value === '') return { ok: true, value: null };
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const d = value.trim();
    const dt = new Date(d + 'T00:00:00Z');
    if (!Number.isNaN(dt.getTime())) return { ok: true, value: d };
  }
  return { ok: false };
}

// GET /api/rooms  -> all rooms, most recently played first, undated last.
router.get('/', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM rooms
       ORDER BY (played_on IS NULL), played_on DESC, name COLLATE NOCASE ASC`
    )
    .all();
  res.json(rows.map(serialize));
});

// GET /api/rooms/:id
router.get('/:id', (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Raum nicht gefunden' });
  res.json(serialize(room));
});

// POST /api/rooms  -> create
router.post('/', (req, res) => {
  const body = req.body || {};
  const name = (body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });

  const date = normaliseDate(body.played_on);
  if (!date.ok) return res.status(400).json({ error: 'Ungültiges Datum (Format JJJJ-MM-TT)' });

  const info = db
    .prepare(
      `INSERT INTO rooms (name, provider, location, country, played_on, notes, printed)
       VALUES (@name, @provider, @location, @country, @played_on, @notes, @printed)`
    )
    .run({
      name,
      provider: (body.provider || '').trim(),
      location: (body.location || '').trim(),
      country: (body.country || '').trim(),
      played_on: date.skip ? null : date.value,
      notes: (body.notes || '').trim(),
      printed: body.printed ? 1 : 0,
    });

  res.status(201).json(serialize(getRoom(info.lastInsertRowid)));
});

// PATCH /api/rooms/:id  -> partial update (fields, date, printed flag)
router.patch('/:id', (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Raum nicht gefunden' });

  const body = req.body || {};
  const sets = [];
  const params = {};

  for (const field of TEXT_FIELDS) {
    if (body[field] !== undefined) {
      sets.push(`${field} = @${field}`);
      params[field] = String(body[field] ?? '').trim();
    }
  }

  if ('played_on' in body) {
    const date = normaliseDate(body.played_on);
    if (!date.ok) return res.status(400).json({ error: 'Ungültiges Datum (Format JJJJ-MM-TT)' });
    sets.push('played_on = @played_on');
    params.played_on = date.value ?? null;
  }

  if ('printed' in body) {
    sets.push('printed = @printed');
    params.printed = body.printed ? 1 : 0;
  }

  if (body.name !== undefined && !params.name) {
    return res.status(400).json({ error: 'Name darf nicht leer sein' });
  }

  if (sets.length === 0) return res.json(serialize(room));

  params.id = room.id;
  db.prepare(
    `UPDATE rooms SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = @id`
  ).run(params);

  res.json(serialize(getRoom(room.id)));
});

// DELETE /api/rooms/:id  -> remove room and its photo file
router.delete('/:id', wrap(async (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Raum nicht gefunden' });
  db.prepare('DELETE FROM rooms WHERE id = ?').run(room.id);
  const p = uploadPath(room.photo);
  if (p) await unlink(p).catch(() => {});
  res.json({ ok: true });
}));

// POST /api/rooms/:id/photo  -> upload & (re)set photo (multipart, field "photo")
router.post('/:id/photo', upload.single('photo'), wrap(async (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Raum nicht gefunden' });
  if (!req.file) return res.status(400).json({ error: 'Keine Datei empfangen' });

  let buf;
  try {
    buf = await sharp(req.file.buffer, { limitInputPixels: 50_000_000, failOn: 'error' })
      .rotate() // honour EXIF orientation from phone cameras
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch {
    return res.status(400).json({ error: 'Bild konnte nicht verarbeitet werden' });
  }

  const filename = `${randomUUID()}.jpg`;
  await writeFile(path.join(UPLOAD_DIR, filename), buf);

  const oldPhoto = room.photo;
  db.prepare("UPDATE rooms SET photo = ?, updated_at = datetime('now') WHERE id = ?").run(
    filename,
    room.id
  );
  const oldPath = uploadPath(oldPhoto);
  if (oldPath) await unlink(oldPath).catch(() => {});

  res.json(serialize(getRoom(room.id)));
}));

// DELETE /api/rooms/:id/photo
router.delete('/:id/photo', wrap(async (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Raum nicht gefunden' });
  const p = uploadPath(room.photo);
  if (p) await unlink(p).catch(() => {});
  db.prepare(
    "UPDATE rooms SET photo = NULL, printed = 0, updated_at = datetime('now') WHERE id = ?"
  ).run(room.id);
  res.json(serialize(getRoom(room.id)));
}));

export default router;
