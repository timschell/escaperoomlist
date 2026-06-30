import { useMemo, useState } from 'react';
import type { Room } from '../types';
import { api } from '../api';
import { flagFor } from '../flags';
import { Icon } from './ui';

// Photo-printing checklist: which room photos still need printing vs. done.
export function PrintView({
  rooms,
  onChanged,
  onOpen,
}: {
  rooms: Room[];
  onChanged: () => void;
  onOpen: (room: Room) => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);

  const withPhoto = useMemo(() => rooms.filter((r) => r.photo), [rooms]);
  const todo = withPhoto.filter((r) => !r.printed);
  const done = withPhoto.filter((r) => r.printed);

  const toggle = async (room: Room) => {
    setBusyId(room.id);
    try {
      await api.updateRoom(room.id, { printed: !room.printed });
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Aktion fehlgeschlagen');
    } finally {
      setBusyId(null);
    }
  };

  const Row = (room: Room) => (
    <div className="print-row" key={room.id}>
      <button className="print-thumb" onClick={() => onOpen(room)}>
        {room.photoUrl && <img src={room.photoUrl} alt="" loading="lazy" />}
      </button>
      <div className="print-info" onClick={() => onOpen(room)}>
        <div className="room-name">{room.name}</div>
        <div className="room-meta">
          {flagFor(room.country)} {room.location || room.country}
        </div>
      </div>
      <button
        className={`check-btn ${room.printed ? 'on' : ''}`}
        onClick={() => toggle(room)}
        disabled={busyId === room.id}
        aria-label={room.printed ? 'Als nicht gedruckt markieren' : 'Als gedruckt markieren'}
      >
        {room.printed ? <Icon.Check /> : <Icon.Printer size={18} />}
      </button>
    </div>
  );

  return (
    <div className="view print-view">
      <div className="print-summary card">
        <Icon.Printer size={26} />
        <div>
          <strong>{done.length}</strong> von <strong>{withPhoto.length}</strong> Fotos ausgedruckt
        </div>
      </div>

      {withPhoto.length === 0 && (
        <div className="empty">
          Noch keine Fotos vorhanden. Füge in einem Raum ein Foto hinzu, dann erscheint es hier.
        </div>
      )}

      {todo.length > 0 && (
        <section className="group">
          <h3 className="group-head">
            Noch auszudrucken <span className="group-count">{todo.length}</span>
          </h3>
          <div className="print-list">{todo.map(Row)}</div>
        </section>
      )}

      {done.length > 0 && (
        <section className="group">
          <h3 className="group-head">
            Bereits ausgedruckt <span className="group-count">{done.length}</span>
          </h3>
          <div className="print-list">{done.map(Row)}</div>
        </section>
      )}
    </div>
  );
}
