'use client';

import { PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { generateId } from 'ai';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useConversations } from '@/components/conversations-provider';
import { Button } from '@/components/ui/button';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useMounted } from '@/hooks/use-mounted';
import { chatHref } from '@/lib/conversations';

const SKELETON_WIDTHS = ['72%', '58%', '66%'];

interface ChatListItem {
  id: string;
  title: string;
}

export interface ChatListProps {
  items: ChatListItem[];
  activeId?: string | null;
  onSelect?: () => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export function ChatList({ items, activeId, onSelect, onDelete, loading }: ChatListProps) {
  return (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel className="px-0 tracking-wide [font-variant-caps:all-small-caps]">
        chats
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {loading &&
            SKELETON_WIDTHS.map((width) => (
              <div key={width} className="flex h-8 items-center px-2">
                <Skeleton className="h-4" style={{ width }} />
              </div>
            ))}
          {!loading && items.length === 0 && (
            <p className="py-1 text-xs text-muted-foreground">No chats yet.</p>
          )}
          {!loading &&
            items.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild isActive={item.id === activeId} size="sm">
                  <Link href={chatHref(item.id)} title={item.title} onClick={onSelect}>
                    <span className="truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {onDelete && (
                  <SidebarMenuAction
                    showOnHover
                    aria-label={`Delete ${item.title}`}
                    onClick={() => onDelete(item.id)}
                  >
                    <TrashIcon />
                  </SidebarMenuAction>
                )}
              </SidebarMenuItem>
            ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function SidebarChats() {
  const router = useRouter();
  const activeId = useSearchParams().get('c');
  const { conversations, remove } = useConversations();
  const { setOpenMobile } = useSidebar();
  const mounted = useMounted();

  return (
    <ChatList
      items={conversations}
      activeId={activeId}
      loading={!mounted}
      onSelect={() => setOpenMobile(false)}
      onDelete={(id) => {
        remove(id);
        if (id === activeId) router.push('/');
      }}
    />
  );
}

export function NewChatButton() {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start gap-2"
      onClick={() => {
        setOpenMobile(false);
        router.push(chatHref(generateId()));
      }}
    >
      <PlusIcon />
      New chat
    </Button>
  );
}
