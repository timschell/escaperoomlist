import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DATA_DIR, UPLOAD_DIR, DB_PATH } from './config.js';

// Make sure the data + upload directories exist before opening the DB.
mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOAD_DIR, { recursive: true });
mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    provider    TEXT    NOT NULL DEFAULT '',
    location    TEXT    NOT NULL DEFAULT '',
    country     TEXT    NOT NULL DEFAULT '',
    played_on   TEXT,                          -- ISO date 'YYYY-MM-DD' or NULL when not yet known
    notes       TEXT    NOT NULL DEFAULT '',
    photo       TEXT,                          -- stored filename in UPLOAD_DIR or NULL
    printed     INTEGER NOT NULL DEFAULT 0,    -- 0/1: is the photo already printed?
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_rooms_country  ON rooms(country);
  CREATE INDEX IF NOT EXISTS idx_rooms_location ON rooms(location);
`);
