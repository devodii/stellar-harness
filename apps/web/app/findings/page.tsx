import type { Metadata } from 'next';
import { Container } from '@/components/container';
import { FindingsExplorer } from '@/components/findings-explorer';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Findings · Stellar Harness' };

export default function FindingsPage() {
  return (
    <Container className="pb-10">
      <PageHeader
        title="Findings"
        description="Everything the scanner flagged, worst first. Open a row for its evidence, or take it to chat to plan a fix."
      />
      <FindingsExplorer />
    </Container>
  );
}
