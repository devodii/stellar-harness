import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ToolOutput } from './tool-renderers';

const meta = { tool: 'getContractTtl', ms: 12 };
const ctx = { decisions: {} };

const render = (toolName: string, output: unknown) =>
  renderToStaticMarkup(
    <TooltipProvider>
      <ToolOutput toolName={toolName} output={output} ctx={ctx} />
    </TooltipProvider>,
  );

const ttl = {
  contractId: 'CDZYZVZNURK4DCD3ZJMBKLDYCB7FIYL3FRVSLRLGL2BEOIN53UP4YNQC',
  wasmHash: null,
  instance: {
    present: true,
    liveUntilLedgerSeq: 100,
    ledgersLeft: 10,
    daysLeft: 1,
    archived: false,
  },
  code: {
    present: true,
    liveUntilLedgerSeq: 50,
    ledgersLeft: null,
    daysLeft: null,
    archived: true,
  },
  invocations: 3,
  snapshotLedger: 90,
  ledgerCloseSeconds: 5.8,
};

describe('ToolOutput', () => {
  it('renders an error row for a failed envelope', () => {
    const html = render('getContractTtl', {
      ok: false,
      error: { code: 'UPSTREAM_TIMEOUT', message: 'rpc timed out' },
      meta,
    });
    expect(html).toContain('[error]');
    expect(html).toContain('UPSTREAM_TIMEOUT');
  });

  it('unwraps a successful envelope into the typed view', () => {
    const html = render('getContractTtl', { ok: true, data: ttl, meta });
    expect(html).toContain('CDZY…YNQC');
    expect(html).toContain('[archived]');
  });

  it('falls back to json for unknown tools', () => {
    expect(render('mysteryTool', { answer: 42 })).toContain('answer');
  });

  it('falls back to json when the shape does not match', () => {
    const html = render('getContractTtl', { ok: true, data: { contractId: 'nope' }, meta });
    expect(html).toContain('contractId');
    expect(html).not.toContain('[archived]');
  });
});
