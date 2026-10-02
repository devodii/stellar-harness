import { Chat } from '@/components/chat';
import { Header } from '@/components/header';
import { WatchPanel } from '@/components/watch-panel';
import { DEMO_ORG } from '@/demo-org';
import { readWatch } from '@/lib/harness';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const watch = await readWatch();
  return (
    <div className="flex h-full flex-col">
      <Header org={DEMO_ORG} />
      <div className="flex min-h-0 flex-1">
        <WatchPanel watch={watch} anchorDomain={DEMO_ORG.anchorDomain} />
        <Chat />
      </div>
    </div>
  );
}
