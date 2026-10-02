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
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

const SKELETON_WIDTHS = ['72%', '58%', '66%'];

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
          {loading &&
            SKELETON_WIDTHS.map((width) => (
              <div key={width} className="flex h-8 items-center px-2" data-sidebar="menu-skeleton">
                <Skeleton className="h-4" style={{ width }} />
              </div>
            ))}
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
