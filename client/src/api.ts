import type { Room, RoomInput, Stats } from './types';

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = `Fehler ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listRooms: () => req<Room[]>('/api/rooms'),
  getStats: () => req<Stats>('/api/stats'),

  createRoom: (data: RoomInput) =>
    req<Room>('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  updateRoom: (id: number, data: RoomInput) =>
    req<Room>(`/api/rooms/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  deleteRoom: (id: number) =>
    req<{ ok: boolean }>(`/api/rooms/${id}`, { method: 'DELETE' }),

  uploadPhoto: (id: number, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return req<Room>(`/api/rooms/${id}/photo`, { method: 'POST', body: form });
  },

  deletePhoto: (id: number) =>
    req<Room>(`/api/rooms/${id}/photo`, { method: 'DELETE' }),

  importData: (rooms: unknown, mode: 'replace' | 'merge') =>
    req<{ ok: boolean; imported: number; total: number }>('/api/backup/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rooms, mode }),
    }),

  exportUrl: '/api/backup/export',
};
