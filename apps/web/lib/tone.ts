export const TONES = ['default', 'muted', 'primary', 'success', 'warning', 'destructive'] as const;
export type Tone = (typeof TONES)[number];

// The design tokens tune --primary (light) and --destructive (dark) as surfaces, so text in those
// tones is derived from the same tokens with relative color syntax to keep it readable.
export const TONE_TEXT: Record<Tone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  primary:
    'text-[color:oklch(from_var(--primary)_calc(l_-_0.3)_c_h)] dark:text-[color:oklch(from_var(--primary)_calc(l_+_0.3)_c_h)]',
  success: 'text-success',
  warning: 'text-warning',
  destructive:
    'text-destructive dark:text-[color:oklch(from_var(--destructive)_calc(l_+_0.32)_calc(c_*_1.6)_h)]',
};
