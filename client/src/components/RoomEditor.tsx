import { useEffect, useRef, useState } from 'react';
import type { Room, RoomInput } from '../types';
import { api } from '../api';
import { KNOWN_COUNTRIES } from '../flags';
import { Icon, Sheet } from './ui';

interface Props {
  open: boolean;
  room: Room | null; // null => create mode
  onClose: () => void;
  onSaved: () => void;
}

const empty: RoomInput = {
  name: '',
  provider: '',
  location: '',
  country: '',
  played_on: '',
  notes: '',
};

export function RoomEditor({ open, room, onClose, onSaved }: Props) {
  const isEdit = !!room;
  const [form, setForm] = useState<RoomInput>(empty);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Re-initialise local state whenever a different room (or create) opens.
  const [initFor, setInitFor] = useState<number | 'new' | null>(null);

  if (open) {
    const key = room ? room.id : 'new';
    if (initFor !== key) {
      setInitFor(key);
      setForm(
        room
          ? {
              name: room.name,
              provider: room.provider,
              location: room.location,
              country: room.country,
              played_on: room.played_on ?? '',
              notes: room.notes,
            }
          : empty
      );
      setPendingPhoto(null);
      setPendingPreview(null);
      setError(null);
    }
  } else if (initFor !== null) {
    setInitFor(null);
  }

  // Release the blob URL whenever the preview changes or the editor unmounts.
  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  const set = (k: keyof RoomInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingPhoto(file);
    setPendingPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    if (!form.name?.trim()) {
      setError('Bitte einen Namen eingeben.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: RoomInput = { ...form, name: form.name.trim() };
      const saved = isEdit
        ? await api.updateRoom(room!.id, payload)
        : await api.createRoom(payload);
      if (pendingPhoto) {
        await api.uploadPhoto(saved.id, pendingPhoto);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async () => {
    if (!room?.photoUrl) {
      setPendingPhoto(null);
      setPendingPreview(null);
      return;
    }
    if (!confirm('Foto wirklich entfernen?')) return;
    setBusy(true);
    try {
      await api.deletePhoto(room.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setBusy(false);
    }
  };

  const togglePrinted = async () => {
    if (!room) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateRoom(room.id, { printed: !room.printed });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setBusy(false);
    }
  };

  const deleteRoom = async () => {
    if (!room) return;
    if (!confirm(`„${room.name}" wirklich löschen?`)) return;
    setBusy(true);
    try {
      await api.deleteRoom(room.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setBusy(false);
    }
  };

  const currentPhoto = pendingPreview ?? room?.photoUrl ?? null;

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? 'Raum bearbeiten' : 'Neuer Raum'}>
      <div className="editor">
        <div className="photo-zone">
          {currentPhoto ? (
            <img src={currentPhoto} alt="" className="photo-preview" />
          ) : (
            <div className="photo-placeholder">
              <Icon.Camera size={32} />
              <span>Noch kein Foto</span>
            </div>
          )}
          <div className="photo-actions">
            <button className="btn btn-soft" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Icon.Camera /> {currentPhoto ? 'Foto ändern' : 'Foto hinzufügen'}
            </button>
            {(room?.photoUrl || pendingPreview) && (
              <button className="btn btn-soft danger" onClick={removePhoto} disabled={busy}>
                <Icon.Trash /> Entfernen
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={onPickPhoto}
          />
          {isEdit && room?.photoUrl && (
            <label className="printed-toggle">
              <input type="checkbox" checked={room.printed} onChange={togglePrinted} disabled={busy} />
              <span className="printed-pill">
                <Icon.Printer size={18} /> {room.printed ? 'Ausgedruckt' : 'Noch nicht ausgedruckt'}
              </span>
            </label>
          )}
        </div>

        <label className="field">
          <span>Name *</span>
          <input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="z. B. Prison Break" autoFocus={!isEdit} />
        </label>

        <label className="field">
          <span>Anbieter</span>
          <input value={form.provider ?? ''} onChange={(e) => set('provider', e.target.value)} placeholder="z. B. Final Escape" />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Stadt</span>
            <input value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} placeholder="Berlin" />
          </label>
          <label className="field">
            <span>Land</span>
            <input list="country-list" value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} placeholder="Deutschland" />
            <datalist id="country-list">
              {KNOWN_COUNTRIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
        </div>

        <label className="field">
          <span>Datum gespielt</span>
          <input type="date" value={form.played_on ?? ''} onChange={(e) => set('played_on', e.target.value)} />
        </label>

        <label className="field">
          <span>Notizen</span>
          <textarea rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" />
        </label>

        {error && <p className="error-msg">{error}</p>}

        <div className="editor-actions">
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Speichern…' : 'Speichern'}
          </button>
          {isEdit && (
            <button className="btn btn-ghost danger" onClick={deleteRoom} disabled={busy}>
              <Icon.Trash /> Raum löschen
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
