import type { AppError } from '../../schema';
import {
  type ExpertContract,
  expertContractsUrl,
  fetchExpertContractPage,
} from '../../stellar/contracts';
import type { Checkpoint, Fetcher, WriteDerived } from './ports';

export const CONTRACTS_DERIVED = 'contracts';
export const EXPERT_PAGE_SIZE = 200;

export type EnumerateDeps = {
  fetch: Fetcher;
  stellarExpertUrl: string;
  writeDerived: WriteDerived;
  checkpoint: Checkpoint;
};

export type EnumerateOptions = { limit?: number; cursor?: string; pageSize?: number };

export type EnumerateResult = {
  records: ExpertContract[];
  pages: number;
  invalid: number;
  cursor: string | null;
  complete: boolean;
  gap: AppError | null;
};

const cursorFor = (record: ExpertContract): string => record.paging_token ?? record.contract;

export const enumerateContracts = async (
  deps: EnumerateDeps,
  options: EnumerateOptions = {},
): Promise<EnumerateResult> => {
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const pageSize = Math.min(options.pageSize ?? EXPERT_PAGE_SIZE, limit);
  const records: ExpertContract[] = [];
  let url: string | null = expertContractsUrl(deps.stellarExpertUrl, {
    limit: pageSize,
    cursor: options.cursor,
  });
  let cursor = options.cursor ?? null;
  let pages = 0;
  let invalid = 0;
  let complete = false;
  let gap: AppError | null = null;

  while (url && records.length < limit) {
    const page = await fetchExpertContractPage(deps.fetch, deps.stellarExpertUrl, url);
    if (!page.ok) {
      gap = page.error;
      break;
    }
    pages += 1;
    invalid += page.value.invalid;
    const kept = page.value.records.slice(0, limit - records.length);
    if (kept.length > 0) {
      records.push(...kept);
      await deps.writeDerived(CONTRACTS_DERIVED, kept);
      cursor = cursorFor(kept[kept.length - 1] as ExpertContract);
      await deps.checkpoint({ cursor, enumerated: records.length, pages });
    }
    const next: string | null = page.value.nextUrl;
    if (!next || next === url || page.value.records.length === 0) {
      complete = true;
      url = null;
    } else {
      url = next;
    }
  }

  return { records, pages, invalid, cursor, complete, gap };
};
