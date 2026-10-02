'use client';

import { cn } from 'cn';
import type * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export interface DetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className,
}: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn('w-full gap-0 sm:max-w-xl', className)}>
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-mono text-sm">{title}</SheetTitle>
          {description && <SheetDescription asChild>{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">{children}</div>
        {footer && <SheetFooter className="border-t border-border">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}
