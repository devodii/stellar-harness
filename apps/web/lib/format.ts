export const ELLIPSIS = '…';

export const truncateMiddle = (value: string, head = 4, tail = 4): string =>
  value.length <= head + tail + 1
    ? value
    : `${value.slice(0, head)}${ELLIPSIS}${value.slice(-tail)}`;

const LONG_TOKEN = /^[A-Za-z0-9]{20,}$/;

const summarizeValue = (value: unknown): string => {
  if (typeof value === 'string') return LONG_TOKEN.test(value) ? truncateMiddle(value) : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.map(summarizeValue).join(',')}]`;
  if (value && typeof value === 'object') return `{${ELLIPSIS}}`;
  return String(value);
};

export const summarizeArgs = (args: unknown, maxLength = 80): string => {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return '';
  const text = Object.entries(args)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${summarizeValue(value)}`)
    .join(', ');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}${ELLIPSIS}` : text;
};

const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export const formatInt = (value: number): string => integer.format(value);

export const formatCompact = (value: number): string => compact.format(value);

export const formatDecimal = (value: number, digits = 2): string =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);

export const formatPercent = (ratio: number, digits = 1): string =>
  `${formatDecimal(ratio * 100, digits)}%`;

export const formatXlm = (value: number): string => `${formatDecimal(value, 7)} XLM`;

export const STROOPS_PER_XLM = 10_000_000;

export const stroopsToXlm = (stroops: number | string): number => Number(stroops) / STROOPS_PER_XLM;

export const formatSeconds = (seconds: number): string => `${formatDecimal(seconds, 2)}s`;

export const formatDays = (days: number): string => `${formatDecimal(days, 1)}d`;

export const ratio = (part: number, whole: number): number | null =>
  whole > 0 ? part / whole : null;

export const formatAgo = (iso: string, now: number = Date.now()): string => {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
};

export const formatDateTime = (iso: string): string =>
  new Date(iso).toISOString().replace('T', ' ').slice(0, 19);
