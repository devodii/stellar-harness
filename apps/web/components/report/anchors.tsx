import { ReportTable } from '@/components/report-table';
import type { Report } from '@/lib/report-model';
import { count, percent, Section, TextLink } from './section';

const STEP_LABELS: Record<string, string> = {
  domainsTested: 'domains tested',
  tomlReachable: 'stellar.toml reachable',
  signingKey: 'signing key valid',
  endpoints: 'endpoints declared',
  infoReadable: '/info readable',
  sep10: 'SEP-10 challenge valid',
  testsPassed: 'read-only anchor tests pass',
};

export function AnchorsSection({ report }: { report: Report }) {
  const funnel = report.csv['anchors_funnel.csv'].map((row, index, rows) => {
    const passed = Number(row.domains);
    const previous = index === 0 ? passed : Number(rows[index - 1]?.domains);
    return { step: row.step ?? '', passed, failed: previous - passed };
  });
  const perSep = Object.entries(report.summary.anchors.perSep).map(([sep, result]) => ({
    sep,
    ...result,
  }));
  return (
    <Section id="anchors" title="Anchors">
      <ReportTable
        rows={funnel}
        rowKey={(row) => row.step}
        columns={[
          { header: 'stage', cell: (row) => STEP_LABELS[row.step] ?? row.step },
          { header: 'passed', align: 'right', cell: (row) => count(row.passed) },
          { header: 'failed', align: 'right', cell: (row) => count(row.failed) },
        ]}
      />
      <h3 className="pt-2 text-sm font-medium">Failing domains</h3>
      <ReportTable
        rows={report.csv['anchors_failing.csv']}
        rowKey={(row) => row.domain ?? ''}
        columns={[
          {
            header: 'domain',
            cell: (row) => (
              <TextLink href={row.toml_url || `https://${row.domain}/.well-known/stellar.toml`}>
                {row.domain}
              </TextLink>
            ),
          },
          { header: 'country', cell: (row) => row.country },
          { header: 'region', cell: (row) => row.region },
          { header: 'first failing stage', cell: (row) => row.stage_failed },
          { header: 'scf round', align: 'right', cell: (row) => row.scf_round },
        ]}
      />
      <h3 className="pt-2 text-sm font-medium">Pass rate per SEP</h3>
      <ReportTable
        rows={perSep}
        rowKey={(row) => row.sep}
        columns={[
          {
            header: 'check',
            cell: (row) =>
              row.sep.replace('tests:', 'anchor tests ').replace('sep6_24', 'sep6 and sep24'),
          },
          { header: 'tested', align: 'right', cell: (row) => count(row.tested) },
          { header: 'passed', align: 'right', cell: (row) => count(row.passed) },
          { header: 'rate', align: 'right', cell: (row) => percent(row.passed, row.tested) },
        ]}
      />
    </Section>
  );
}
