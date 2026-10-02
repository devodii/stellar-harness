const ELLIPSIS = '…';

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

export const formatDecimal = (value: number, digits = 2): string =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
