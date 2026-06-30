import path from 'node:path';

// In Docker DATA_DIR is mounted as a persistent volume (/data).
// Locally it defaults to server/.data (gitignored).
export const PORT = Number(process.env.PORT) || 3000;
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads');
export const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'escaperooms.db');

// Largest accepted upload before sharp downscales it (phone photos are well under this).
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
