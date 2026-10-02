export const TONES = ['default', 'muted', 'primary', 'success', 'warning', 'destructive'] as const;
export type Tone = (typeof TONES)[number];

export const TONE_TEXT: Record<Tone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

export const TONE_SURFACE: Record<Tone, string> = {
  default: 'border-border bg-card text-card-foreground',
  muted: 'border-border bg-muted text-muted-foreground',
  primary: 'border-primary/40 bg-primary/10 text-foreground',
  success: 'border-success/40 bg-success/10 text-success',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
};
