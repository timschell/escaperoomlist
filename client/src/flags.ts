// Maps the German country names used in the data to flag emoji.
const FLAGS: Record<string, string> = {
  Deutschland: '🇩🇪',
  Österreich: '🇦🇹',
  Schweiz: '🇨🇭',
  Italien: '🇮🇹',
  Spanien: '🇪🇸',
  Frankreich: '🇫🇷',
  Portugal: '🇵🇹',
  Polen: '🇵🇱',
  Tschechien: '🇨🇿',
  Slowakei: '🇸🇰',
  Slowkei: '🇸🇰',
  Griechenland: '🇬🇷',
  Thailand: '🇹🇭',
  Kanada: '🇨🇦',
  USA: '🇺🇸',
  Andorra: '🇦🇩',
  Niederlande: '🇳🇱',
  Belgien: '🇧🇪',
  Ungarn: '🇭🇺',
  Kroatien: '🇭🇷',
  Slowenien: '🇸🇮',
  Dänemark: '🇩🇰',
  Schweden: '🇸🇪',
  Norwegen: '🇳🇴',
  Finnland: '🇫🇮',
  Irland: '🇮🇪',
  Großbritannien: '🇬🇧',
  England: '🇬🇧',
};

export function flagFor(country: string): string {
  return FLAGS[country?.trim()] ?? '🏳️';
}

// All known country names, for the datalist in the editor.
export const KNOWN_COUNTRIES = Object.keys(FLAGS).filter((c) => c !== 'Slowkei');
