'use client';

import { cn } from 'cn';
import dynamic from 'next/dynamic';
import type * as React from 'react';
import type UseAnimationsComponent from 'react-useanimations';
import loadingModule from 'react-useanimations/lib/loading';

const interopDefault = <T,>(value: T | { default: T }): T =>
  typeof value === 'object' && value !== null && 'default' in value ? value.default : value;

const loadingAnimation = interopDefault(loadingModule);

const UseAnimations = dynamic(
  async () => interopDefault((await import('react-useanimations')).default),
  { ssr: false },
);

type UseAnimationsProps = React.ComponentProps<typeof UseAnimationsComponent>;

export interface SpinnerProps extends Omit<UseAnimationsProps, 'animation' | 'size'> {
  size?: number;
}

export function Spinner({
  size = 16,
  strokeColor = 'currentColor',
  className,
  ...props
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <UseAnimations animation={loadingAnimation} size={size} strokeColor={strokeColor} {...props} />
    </span>
  );
}
