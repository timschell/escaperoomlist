import { useMemo, useState } from 'react';
import type { Room } from '../types';
import { flagFor } from '../flags';
import { classNames, formatDate } from '../util';
import { Icon } from './ui';

type Filter = 'alle' | 'ohne-datum' | 'mit-foto' | 'ohne-foto' | 'gedruckt' | 'nicht-gedruckt';
type Group = 'land' | 'stadt' | 'jahr' | 'keine';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'ohne-datum', label: 'Ohne Datum' },
  { key: 'mit-foto', label: 'Mit Foto' },
  { key: 'ohne-foto', label: 'Ohne Foto' },
  { key: 'gedruckt', label: 'Ausgedruckt' },
  { key: 'nicht-gedruckt', label: 'Nicht gedruckt' },
];

const GROUPS: { key: Group; label: string }[] = [
  { key: 'land', label: 'Land' },
  { key: 'stadt', label: 'Stadt' },
  { key: 'jahr', label: 'Jahr' },
  { key: 'keine', label: 'Datum' },
];

function matchesFilter(r: Room, f: Filter): boolean {
  switch (f) {
    case 'ohne-datum':
      return !r.played_on;
    case 'mit-foto':
      return !!r.photo;
    case 'ohne-foto':
      return !r.photo;
    case 'gedruckt':
      return r.printed;
    case 'nicht-gedruckt':
      return !!r.photo && !r.printed;
    default:
      return true;
  }
}

function RoomCard({ room, onClick }: { room: Room; onClick: () => void }) {
  return (
    <button className="room-card" onClick={onClick}>
      <div className="room-thumb">
        {room.photoUrl ? (
          <img src={room.photoUrl} alt="" loading="lazy" />
        ) : (
          <span className="thumb-flag">{flagFor(room.country)}</span>
        )}
        {room.photo && (
          <span
            className={classNames('thumb-print', room.printed && 'on')}
            title={room.printed ? 'Ausgedruckt' : 'Noch nicht ausgedruckt'}
          >
            <Icon.Printer size={13} />
          </span>
        )}
      </div>
      <div className="room-info">
        <div className="room-name">{room.name}</div>
        {room.provider && <div className="room-provider">{room.provider}</div>}
        <div className="room-meta">
          <span>
            {flagFor(room.country)} {room.location || room.country || '—'}
          </span>
        </div>
      </div>
      <div className="room-right">
        {room.played_on ? (
          <span className="date-badge">
            <Icon.Calendar size={13} /> {formatDate(room.played_on)}
          </span>
        ) : (
          <span className="date-badge missing">
            <Icon.Calendar size={13} /> Datum
          </span>
        )}
      </div>
    </button>
  );
}

export function ListView({
  rooms,
  onOpen,
}: {
  rooms: Room[];
  onOpen: (room: Room) => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('alle');
  const [group, setGroup] = useState<Group>('land');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => {
      if (!matchesFilter(r, filter)) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.provider.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q)
      );
    });
  }, [rooms, search, filter]);

  const groups = useMemo(() => {
    if (group === 'keine') {
      return [{ key: '', label: '', items: filtered }];
    }
    const map = new Map<string, Room[]>();
    for (const r of filtered) {
      let key: string;
      if (group === 'land') key = r.country || 'Ohne Land';
      else if (group === 'stadt') key = r.location || 'Ohne Stadt';
      else key = r.played_on ? r.played_on.slice(0, 4) : 'Ohne Datum';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    const entries = [...map.entries()].map(([key, items]) => ({
      key,
      label: key,
      items,
    }));
    entries.sort((a, b) => {
      if (group === 'jahr') return b.key.localeCompare(a.key); // newest year first
      return b.items.length - a.items.length || a.key.localeCompare(b.key);
    });
    return entries;
  }, [filtered, group]);

  return (
    <div className="view list-view">
      <div className="search-bar">
        <Icon.Search />
        <input
          type="search"
          placeholder="Raum, Anbieter, Stadt…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="chips" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={classNames('chip', filter === f.key && 'active')}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="group-row">
        <span className="group-label">Gruppieren:</span>
        {GROUPS.map((g) => (
          <button
            key={g.key}
            className={classNames('seg', group === g.key && 'active')}
            onClick={() => setGroup(g.key)}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="result-count">
        {filtered.length} {filtered.length === 1 ? 'Raum' : 'Räume'}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">Keine Räume gefunden.</div>
      ) : (
        groups.map((grp) => (
          <section key={grp.key} className="group">
            {grp.label && (
              <h3 className="group-head">
                {group === 'land' && <span>{flagFor(grp.label)}</span>} {grp.label}
                <span className="group-count">{grp.items.length}</span>
              </h3>
            )}
            <div className="room-list">
              {grp.items.map((room) => (
                <RoomCard key={room.id} room={room} onClick={() => onOpen(room)} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
