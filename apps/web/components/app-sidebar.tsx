'use client';

import type { Icon } from '@phosphor-icons/react';
import { ChatsIcon, InfoIcon, ListMagnifyingGlassIcon, PlusIcon } from '@phosphor-icons/react/ssr';
import { generateId } from 'ai';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { ChatList, type ChatListItem } from '@/components/chat-list';
import { useConversations } from '@/components/conversations-provider';
import { useNetwork } from '@/components/network-provider';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useMounted } from '@/hooks/use-mounted';
import { chatHref, NAV } from '@/lib/routes';

const NAV_ICONS: Record<(typeof NAV)[number]['href'], Icon> = {
  '/': ChatsIcon,
  '/findings': ListMagnifyingGlassIcon,
  '/about': InfoIcon,
};

export interface AppSidebarViewProps {
  pathname: string;
  conversations: ChatListItem[];
  activeId: string | null;
  loading?: boolean;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  chats?: React.ReactNode;
}

export function AppSidebarView({
  pathname,
  conversations,
  activeId,
  loading,
  onNewChat,
  onDelete,
  chats,
}: AppSidebarViewProps) {
  const { network } = useNetwork();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNewChat}
          className="justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
        >
          <PlusIcon className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">New chat</span>
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const ItemIcon = NAV_ICONS[item.href];
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <ItemIcon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {chats ?? (
          <ChatList
            items={conversations}
            activeId={activeId}
            hrefFor={chatHref}
            onDelete={onDelete}
            loading={loading}
          />
        )}
      </SidebarContent>
      <SidebarFooter className="px-3 pb-3 group-data-[collapsible=icon]:hidden">
        <p className="font-mono text-[11px] text-muted-foreground">{network} · read-only</p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function SidebarChats() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { conversations, ready, remove } = useConversations();
  const mounted = useMounted();
  const activeId = pathname === '/' ? searchParams.get('c') : null;

  return (
    <ChatList
      items={mounted ? conversations : []}
      activeId={activeId}
      hrefFor={chatHref}
      loading={!mounted || !ready}
      onDelete={(id) => {
        remove(id);
        if (id === activeId) router.push('/');
      }}
    />
  );
}

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <AppSidebarView
      pathname={pathname}
      conversations={[]}
      activeId={null}
      onNewChat={() => router.push(chatHref(generateId()))}
      onDelete={() => {}}
      chats={
        <React.Suspense
          fallback={<ChatList items={[]} activeId={null} hrefFor={chatHref} loading />}
        >
          <SidebarChats />
        </React.Suspense>
      }
    />
  );
}
