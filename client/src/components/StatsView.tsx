import type { Stats } from '../types';
import { flagFor } from '../flags';

function Bars({
  title,
  rows,
  max,
  flag,
}: {
  title: string;
  rows: { label: string; sub?: string; count: number }[];
  max: number;
  flag?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="card">
      <h3 className="card-title">{title}</h3>
      <div className="bars">
        {rows.map((r) => (
          <div className="bar-row" key={r.label + (r.sub ?? '')}>
            <div className="bar-label">
              {flag && <span>{flagFor(r.label)}</span>} {r.label}
              {r.sub && <span className="bar-sub"> · {r.sub}</span>}
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
            <div className="bar-count">{r.count}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StatsView({ stats }: { stats: Stats | null }) {
  if (!stats) return <div className="view"><div className="empty">Lade Statistik…</div></div>;

  const maxCountry = Math.max(1, ...stats.byCountry.map((c) => c.count));
  const maxCity = Math.max(1, ...stats.byLocation.map((c) => c.count));
  const maxYear = Math.max(1, ...stats.byYear.map((c) => c.count));

  return (
    <div className="view stats-view">
      <div className="big-stats">
        <div className="big-stat accent">
          <div className="big-num">{stats.total}</div>
          <div className="big-label">Räume gespielt</div>
        </div>
        <div className="big-stat">
          <div className="big-num">{stats.countries}</div>
          <div className="big-label">Länder</div>
        </div>
        <div className="big-stat">
          <div className="big-num">{stats.cities}</div>
          <div className="big-label">Städte</div>
        </div>
        <div className="big-stat">
          <div className="big-num">{stats.withPhoto}</div>
          <div className="big-label">mit Foto</div>
        </div>
      </div>

      <div className="mini-stats">
        <div className="mini">
          <span className="mini-num warn">{stats.withoutDate}</span> ohne Datum
        </div>
        <div className="mini">
          <span className="mini-num">{stats.printed}</span> ausgedruckt
        </div>
        <div className="mini">
          <span className="mini-num warn">{stats.notPrinted}</span> zu drucken
        </div>
      </div>

      <Bars
        title="Nach Land"
        flag
        max={maxCountry}
        rows={stats.byCountry.map((c) => ({ label: c.country, count: c.count }))}
      />
      <Bars
        title="Top Städte"
        max={maxCity}
        rows={stats.byLocation.slice(0, 12).map((c) => ({ label: c.location, sub: c.country, count: c.count }))}
      />
      {stats.byYear.length > 0 && (
        <Bars
          title="Nach Jahr"
          max={maxYear}
          rows={stats.byYear.map((y) => ({ label: y.year, count: y.count }))}
        />
      )}
      <Bars
        title="Top Anbieter"
        max={Math.max(1, ...stats.byProvider.map((p) => p.count))}
        rows={stats.byProvider.slice(0, 10).map((p) => ({ label: p.provider, count: p.count }))}
      />
    </div>
  );
}
