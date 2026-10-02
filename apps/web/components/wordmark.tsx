import { cn } from 'cn';
import Link from 'next/link';

export interface WordmarkProps {
  href?: string;
  className?: string;
}

export function Wordmark({ href = '/', className }: WordmarkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'shrink-0 font-display text-xl leading-none whitespace-nowrap text-foreground',
        className,
      )}
    >
      Stellar Harness
    </Link>
  );
}
