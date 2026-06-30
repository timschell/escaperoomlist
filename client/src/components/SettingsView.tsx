import { useRef, useState } from 'react';
import { api } from '../api';
import type { Stats } from '../types';

export function SettingsView({
  stats,
  onChanged,
}: {
  stats: Stats | null;
  onChanged: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setMsg('Datei ist kein gültiges JSON.');
      return;
    }
    const rooms = Array.isArray(data) ? data : (data as { rooms?: unknown }).rooms;
    if (!Array.isArray(rooms)) {
      setMsg('Kein gültiges Backup (Liste „rooms" fehlt).');
      return;
    }
    const replace = confirm(
      `Backup mit ${rooms.length} Räumen gefunden.\n\nOK = ALLES ERSETZEN (vorhandene Räume werden gelöscht)\nAbbrechen = stattdessen HINZUFÜGEN`
    );
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.importData(rooms, replace ? 'replace' : 'merge');
      setMsg(`Import fertig: ${res.imported} Räume importiert (gesamt ${res.total}).`);
      onChanged();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Import fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="view settings-view">
      <section className="card">
        <h3 className="card-title">Backup</h3>
        <p className="muted">
          Exportiere alle Raumdaten als JSON-Datei. Die Fotos selbst liegen im Server-Volume
          <code> /data/uploads</code> und sollten separat gesichert werden.
        </p>
        <a className="btn btn-primary" href={api.exportUrl} download>
          Daten exportieren
        </a>
        <button
          className="btn btn-soft"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          style={{ marginTop: 10 }}
        >
          {busy ? 'Importiere…' : 'Backup importieren'}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
        {msg && <p className="info-msg">{msg}</p>}
      </section>

      {stats && (
        <section className="card">
          <h3 className="card-title">Übersicht</h3>
          <ul className="kv">
            <li><span>Räume gesamt</span><b>{stats.total}</b></li>
            <li><span>Mit Datum</span><b>{stats.withDate}</b></li>
            <li><span>Ohne Datum</span><b>{stats.withoutDate}</b></li>
            <li><span>Mit Foto</span><b>{stats.withPhoto}</b></li>
            <li><span>Ausgedruckt</span><b>{stats.printed}</b></li>
            <li><span>Länder</span><b>{stats.countries}</b></li>
          </ul>
        </section>
      )}

      <p className="footer-note">Escape Room Tracker · lokal auf deinem Server</p>
    </div>
  );
}
