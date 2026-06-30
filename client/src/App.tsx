import { useCallback, useEffect, useState } from 'react';
import type { Room, Stats } from './types';
import { api } from './api';
import { classNames } from './util';
import { Icon } from './components/ui';
import { ListView } from './components/ListView';
import { StatsView } from './components/StatsView';
import { PrintView } from './components/PrintView';
import { SettingsView } from './components/SettingsView';
import { RoomEditor } from './components/RoomEditor';

type Tab = 'liste' | 'statistik' | 'druck' | 'einstellungen';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'liste', label: 'Räume', icon: <Icon.List /> },
  { key: 'statistik', label: 'Statistik', icon: <Icon.Chart /> },
  { key: 'druck', label: 'Drucken', icon: <Icon.Printer /> },
  { key: 'einstellungen', label: 'Mehr', icon: <Icon.Gear /> },
];

export function App() {
  const [tab, setTab] = useState<Tab>('liste');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);

  const reload = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([api.listRooms(), api.getStats()]);
      setRooms(r);
      setStats(s);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const openRoom = (room: Room) => {
    setEditing(room);
    setEditorOpen(true);
  };
  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  // Keep the editor's room in sync after a reload (so toggles reflect immediately).
  const onSaved = useCallback(async () => {
    await reload();
  }, [reload]);

  const titles: Record<Tab, string> = {
    liste: 'Escape Rooms',
    statistik: 'Statistik',
    druck: 'Fotos drucken',
    einstellungen: 'Mehr',
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-logo">🔓</span>
          <div>
            <div className="brand-title">{titles[tab]}</div>
            {tab === 'liste' && stats && (
              <div className="brand-sub">
                {stats.total} Räume · {stats.countries} Länder
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="content">
        {error && (
          <div className="banner-error" onClick={reload}>
            {error} – tippen zum Neuladen
          </div>
        )}
        {loading ? (
          <div className="empty">Lade…</div>
        ) : (
          <>
            {tab === 'liste' && <ListView rooms={rooms} onOpen={openRoom} />}
            {tab === 'statistik' && <StatsView stats={stats} />}
            {tab === 'druck' && <PrintView rooms={rooms} onChanged={onSaved} onOpen={openRoom} />}
            {tab === 'einstellungen' && <SettingsView stats={stats} onChanged={onSaved} />}
          </>
        )}
      </main>

      {tab === 'liste' && (
        <button className="fab" onClick={openNew} aria-label="Neuer Raum">
          <Icon.Plus />
        </button>
      )}

      <nav className="bottom-nav">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={classNames('nav-btn', tab === t.key && 'active')}
            onClick={() => setTab(t.key)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <RoomEditor
        open={editorOpen}
        room={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={onSaved}
      />
    </div>
  );
}
