'use client';

import { ArrowBendUpLeftIcon } from '@phosphor-icons/react';
import { cn } from 'cn';
import { motion, useMotionValue, useTransform } from 'motion/react';
import type * as React from 'react';

export const REPLY_THRESHOLD_PX = 56;

export interface SwipeToReplyProps {
  onReply: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SwipeToReply({ onReply, disabled, children, className }: SwipeToReplyProps) {
  const x = useMotionValue(0);
  const iconOpacity = useTransform(x, [8, REPLY_THRESHOLD_PX], [0, 1]);
  const iconScale = useTransform(x, [8, REPLY_THRESHOLD_PX], [0.6, 1]);

  return (
    <div className={cn('group/reply relative', className)}>
      <motion.div
        aria-hidden
        style={{ opacity: iconOpacity, scale: iconScale }}
        className="pointer-events-none absolute top-1/2 left-0 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <ArrowBendUpLeftIcon className="size-4" />
      </motion.div>
      <motion.div
        drag={disabled ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.45 }}
        dragSnapToOrigin
        onDragEnd={(_event, info) => {
          if (info.offset.x < REPLY_THRESHOLD_PX) return;
          navigator.vibrate?.(10);
          onReply();
        }}
        style={{ x, touchAction: 'pan-y' }}
        className="relative"
      >
        {children}
      </motion.div>
      {!disabled && (
        <button
          type="button"
          onClick={onReply}
          aria-label="Reply to this message"
          className="absolute top-0 -right-9 hidden size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover/reply:opacity-100 md:inline-flex"
        >
          <ArrowBendUpLeftIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
