import { Address } from '@/components/address';
import { BracketTag } from '@/components/bracket-tag';
import { ResultSection } from '@/components/result-section';
import { StatLabel } from '@/components/stat';
import { explorerUrl } from '@/lib/links';
import type { EcosystemView as EcosystemData } from '@/lib/tool-views';

export function EcosystemView({ ecosystem }: { ecosystem: EcosystemData }) {
  const empty = ecosystem.projects.length === 0 && ecosystem.repos.length === 0;
  return (
    <ResultSection
      title={`search "${ecosystem.query}"`}
      aside={
        <span className="font-mono text-xs text-muted-foreground">
          {ecosystem.projects.length} projects · {ecosystem.repos.length} repos
        </span>
      }
    >
      {empty && <p className="text-xs text-muted-foreground">No matches.</p>}
      {ecosystem.projects.length > 0 && (
        <div className="space-y-1">
          <StatLabel>projects</StatLabel>
          <ul className="divide-y divide-border">
            {ecosystem.projects.map((project) => (
              <li key={project.slug} className="space-y-0.5 py-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {project.website ? (
                    <a
                      href={project.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-foreground underline-offset-2 hover:underline"
                    >
                      {project.name}
                    </a>
                  ) : (
                    <span className="text-sm text-foreground">{project.name}</span>
                  )}
                  {project.scfAwarded && (
                    <BracketTag
                      label={project.scfRound ? `scf round ${project.scfRound}` : 'scf'}
                      tone="primary"
                    />
                  )}
                </div>
                {project.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {project.description}
                  </p>
                )}
                {project.contracts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {project.contracts.map((contract) => (
                      <Address
                        key={contract}
                        value={contract}
                        href={explorerUrl('contract', contract)}
                      />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {ecosystem.repos.length > 0 && (
        <div className="space-y-1">
          <StatLabel>repos</StatLabel>
          <ul className="space-y-1">
            {ecosystem.repos.map((repo) => (
              <li key={repo.url} className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  {repo.name}
                </a>
                {repo.score !== null && <BracketTag label={`score ${repo.score}`} />}
                {repo.mainnetContractId && <Address value={repo.mainnetContractId} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </ResultSection>
  );
}
