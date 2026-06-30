import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.join(__dirname, '..', 'seed', 'initial_escape_rooms.json');

// Normalise obvious typos so grouping/stats stay clean.
const COUNTRY_FIX = {
  Slowkei: 'Slowakei',
};

// The seed file uses German "DD.MM.YYYY" and the placeholder "Datum" for unknown dates.
export function parseGermanDate(raw) {
  if (raw == null || typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t || t.toLowerCase() === 'datum') return null;
  const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t; // already ISO
  return null;
}

export function seedIfEmpty() {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM rooms').get();
  if (c > 0) return { seeded: false, count: c };

  let rooms;
  try {
    rooms = JSON.parse(readFileSync(SEED_FILE, 'utf8'));
  } catch (err) {
    console.warn('[seed] could not read seed file, starting empty:', err.message);
    return { seeded: false, count: 0 };
  }

  const insert = db.prepare(
    'INSERT INTO rooms (name, provider, location, country, played_on) VALUES (?, ?, ?, ?, ?)'
  );
  const tx = db.transaction((items) => {
    for (const r of items) {
      const rawCountry = (r.country || '').trim();
      const country = COUNTRY_FIX[rawCountry] || rawCountry;
      insert.run(
        (r.name || '').trim(),
        (r.provider || '').trim(),
        (r.location || '').trim(),
        country,
        parseGermanDate(r.date)
      );
    }
  });
  tx(rooms);
  return { seeded: true, count: rooms.length };
}
