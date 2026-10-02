'use client';

import { cn } from 'cn';
import type * as React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

export interface ResponsiveSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  side?: 'right' | 'left';
  className?: string;
  bodyClassName?: string;
}

const TITLE_CLASS = 'font-mono text-sm';
const BODY_CLASS = 'flex-1 space-y-4 overflow-y-auto overscroll-contain p-4';

export function ResponsiveSheet({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  footer,
  children,
  side = 'right',
  className,
  bodyClassName,
}: ResponsiveSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
        <DrawerContent className={cn('max-h-[88dvh]', className)}>
          <DrawerHeader className="border-b border-border text-left">
            <DrawerTitle className={TITLE_CLASS}>{title}</DrawerTitle>
            {description && <DrawerDescription asChild>{description}</DrawerDescription>}
          </DrawerHeader>
          <div className={cn(BODY_CLASS, bodyClassName)}>{children}</div>
          {footer && (
            <DrawerFooter className="border-t border-border pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent side={side} className={cn('w-full gap-0 sm:max-w-xl', className)}>
        <SheetHeader className="border-b border-border">
          <SheetTitle className={TITLE_CLASS}>{title}</SheetTitle>
          {description && <SheetDescription asChild>{description}</SheetDescription>}
        </SheetHeader>
        <div className={cn(BODY_CLASS, bodyClassName)}>{children}</div>
        {footer && <SheetFooter className="border-t border-border">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}
