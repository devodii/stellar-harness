export const truncateId = (id: string, keep = 4): string =>
  id.length > keep * 2 + 1 ? `${id.slice(0, keep)}…${id.slice(-keep)}` : id;

export const formatXlm = (xlm: number | string): string =>
  `${Number(xlm).toLocaleString('en-US', { maximumFractionDigits: 2 })} XLM`;
