import { Suspense } from 'react';
import { ChatPage } from '@/components/chat-page';

export default function Page() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  );
}
