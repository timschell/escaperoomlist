export interface Room {
  id: number;
  name: string;
  provider: string;
  location: string;
  country: string;
  played_on: string | null; // 'YYYY-MM-DD' or null
  notes: string;
  photo: string | null;
  photoUrl: string | null;
  printed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  total: number;
  withDate: number;
  withoutDate: number;
  withPhoto: number;
  withoutPhoto: number;
  printed: number;
  notPrinted: number;
  countries: number;
  cities: number;
  byCountry: { country: string; count: number }[];
  byLocation: { location: string; country: string; count: number }[];
  byProvider: { provider: string; count: number }[];
  byYear: { year: string; count: number }[];
}

export type RoomInput = Partial<
  Pick<Room, 'name' | 'provider' | 'location' | 'country' | 'played_on' | 'notes' | 'printed'>
>;
