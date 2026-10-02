export const TONES = ['default', 'muted', 'primary', 'success', 'warning', 'destructive'] as const;
export type Tone = (typeof TONES)[number];

export const TONE_TEXT: Record<Tone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  primary: 'text-[color-mix(in_oklch,var(--primary),var(--foreground)_45%)]',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};
