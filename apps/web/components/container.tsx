import { cn } from 'cn';
import type * as React from 'react';

const SIZE_CLASS = {
  sm: 'max-w-2xl',
  md: 'max-w-3xl',
  lg: 'max-w-6xl',
  full: 'max-w-none',
} as const;

export interface ContainerProps extends React.ComponentProps<'div'> {
  size?: keyof typeof SIZE_CLASS;
}

export function Container({ size = 'lg', className, ...props }: ContainerProps) {
  return (
    <div className={cn('mx-auto w-full px-4 md:px-6', SIZE_CLASS[size], className)} {...props} />
  );
}
