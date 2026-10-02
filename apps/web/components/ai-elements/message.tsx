import type { UIMessage } from 'ai';
import { cn } from 'cn';
import type { ComponentProps } from 'react';
import { Streamdown } from 'streamdown';

export const Message = ({
  from,
  className,
  ...props
}: ComponentProps<'div'> & { from: UIMessage['role'] }) => (
  <div
    className={cn(
      'flex w-full flex-col gap-3',
      from === 'user' ? 'items-end' : 'items-start',
      className,
    )}
    {...props}
  />
);

export const MessageContent = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={cn('flex w-full min-w-0 flex-col gap-3 text-sm', className)} {...props} />
);

export const MessageResponse = ({
  className,
  ...props
}: ComponentProps<typeof Streamdown>) => (
  <Streamdown className={cn('size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)} {...props} />
);
