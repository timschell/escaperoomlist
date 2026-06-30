import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/stats -> aggregate numbers for the dashboard
router.get('/', (_req, res) => {
  const one = (sql) => db.prepare(sql).get().c;

  const total = one('SELECT COUNT(*) AS c FROM rooms');
  const withDate = one('SELECT COUNT(*) AS c FROM rooms WHERE played_on IS NOT NULL');
  const withPhoto = one('SELECT COUNT(*) AS c FROM rooms WHERE photo IS NOT NULL');
  // Scope printed to rooms that actually have a photo so the print split stays consistent.
  const printed = one('SELECT COUNT(*) AS c FROM rooms WHERE printed = 1 AND photo IS NOT NULL');
  const notPrinted = one('SELECT COUNT(*) AS c FROM rooms WHERE photo IS NOT NULL AND printed = 0');
  const countries = one("SELECT COUNT(DISTINCT country) AS c FROM rooms WHERE country <> ''");
  const cities = one("SELECT COUNT(DISTINCT location) AS c FROM rooms WHERE location <> ''");

  const byCountry = db
    .prepare(
      `SELECT country, COUNT(*) AS count FROM rooms
       WHERE country <> '' GROUP BY country ORDER BY count DESC, country COLLATE NOCASE`
    )
    .all();
  const byLocation = db
    .prepare(
      `SELECT location, country, COUNT(*) AS count FROM rooms
       WHERE location <> '' GROUP BY location, country ORDER BY count DESC, location COLLATE NOCASE`
    )
    .all();
  const byProvider = db
    .prepare(
      `SELECT provider, COUNT(*) AS count FROM rooms
       WHERE provider <> '' GROUP BY provider ORDER BY count DESC, provider COLLATE NOCASE`
    )
    .all();
  const byYear = db
    .prepare(
      `SELECT substr(played_on, 1, 4) AS year, COUNT(*) AS count FROM rooms
       WHERE played_on IS NOT NULL GROUP BY year ORDER BY year`
    )
    .all();

  res.json({
    total,
    withDate,
    withoutDate: total - withDate,
    withPhoto,
    withoutPhoto: total - withPhoto,
    printed,
    notPrinted,
    countries,
    cities,
    byCountry,
    byLocation,
    byProvider,
    byYear,
  });
});

export default router;
