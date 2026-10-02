const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

let byName: Map<string, string> | null = null;

const normalize = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

const ALIASES: Record<string, string> = {
  usa: 'US',
  unitedstatesofamerica: 'US',
  uk: 'GB',
  england: 'GB',
  uae: 'AE',
};

const nameIndex = (): Map<string, string> => {
  if (byName) return byName;
  const names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
  byName = new Map(Object.entries(ALIASES));
  for (const a of LETTERS) {
    for (const b of LETTERS) {
      const code = `${a}${b}`;
      const name = names.of(code);
      if (name && !byName.has(normalize(name))) byName.set(normalize(name), code);
    }
  }
  return byName;
};

export const countryCode = (country: string | null | undefined): string | null => {
  const trimmed = country?.trim();
  if (!trimmed) return null;
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return nameIndex().get(normalize(trimmed)) ?? null;
};
