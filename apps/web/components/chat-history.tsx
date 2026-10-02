'use client';

import { TrashIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useConversations } from '@/components/conversations-provider';
import { ResponsiveSheet } from '@/components/responsive-sheet';
import { Button } from '@/components/ui/button';
import { chatHref } from '@/lib/conversations';

export function ChatHistory() {
  const router = useRouter();
  const activeId = useSearchParams().get('c');
  const { conversations, remove } = useConversations();
  const [open, setOpen] = React.useState(false);

  const startNew = () => {
    setOpen(false);
    router.push('/');
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={setOpen}
      title="history"
      trigger={
        <Button variant="link" size="sm" className="px-0">
          history
        </Button>
      }
      footer={
        <Button size="sm" onClick={startNew}>
          new chat
        </Button>
      }
    >
      {conversations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No saved chats yet.</p>
      ) : (
        <ul className="space-y-1">
          {conversations.map((conversation) => (
            <li
              key={conversation.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent data-[active=true]:bg-accent"
              data-active={conversation.id === activeId}
            >
              <Link
                href={chatHref(conversation.id)}
                onClick={() => setOpen(false)}
                className="min-w-0 flex-1 truncate text-sm"
              >
                {conversation.title}
              </Link>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Delete ${conversation.title}`}
                onClick={() => {
                  remove(conversation.id);
                  if (conversation.id === activeId) router.push('/');
                }}
              >
                <TrashIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </ResponsiveSheet>
  );
}
