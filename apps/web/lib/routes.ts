export const chatHref = (conversationId: string): string =>
  `/?c=${encodeURIComponent(conversationId)}`;

export const findingChatHref = (findingId: string): string =>
  `/?finding=${encodeURIComponent(findingId)}`;

export const promptHref = (prompt: string): string => `/?q=${encodeURIComponent(prompt)}`;

export const NAV = [
  { href: '/', label: 'Chat' },
  { href: '/findings', label: 'Findings' },
  { href: '/about', label: 'About' },
] as const;
