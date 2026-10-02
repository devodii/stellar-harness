'use client';

import { TrashIcon } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';

export interface ChatListItem {
  id: string;
  title: string;
  updatedAt: string;
}

export interface ChatListProps {
  items: ChatListItem[];
  activeId?: string | null;
  hrefFor: (id: string) => string;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export function ChatList({ items, activeId, hrefFor, onDelete, loading }: ChatListProps) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="tracking-wide [font-variant-caps:all-small-caps]">
        chats
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {loading && ['a', 'b', 'c'].map((key) => <SidebarMenuSkeleton key={key} />)}
          {!loading && items.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">No chats yet.</p>
          )}
          {!loading &&
            items.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild isActive={item.id === activeId} size="sm">
                  <Link href={hrefFor(item.id)} title={item.title}>
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
