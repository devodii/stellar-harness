const HOSTNAME =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

export const normalizeDomain = (input: string): string | null => {
  const raw = input.trim().toLowerCase();
  if (raw.length === 0) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.port !== '' || url.username !== '' || url.password !== '') return null;
    const host = url.hostname.replace(/\.$/, '');
    return HOSTNAME.test(host) ? host : null;
  } catch {
    return null;
  }
};

export const hostOf = (url: string): string | null => {
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return null;
  }
};

export const stripWww = (host: string): string => host.replace(/^www\./, '');

export const tomlUrlFor = (domain: string): string => `https://${domain}/.well-known/stellar.toml`;
