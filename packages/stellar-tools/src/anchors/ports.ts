import type { Result } from '@harness/schema';

export type HttpResponse = {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  ms: number;
  cached: boolean;
  tls?: { ok: boolean; error?: string };
};

export type HttpRequest = {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxRedirects?: number;
};

export type Fetcher = (url: string, init?: HttpRequest) => Promise<Result<HttpResponse>>;

export type HorizonAccount = {
  id: string;
  sequence: string;
  home_domain?: string;
  subentry_count: number;
  thresholds: { low_threshold: number; med_threshold: number; high_threshold: number };
  flags: {
    auth_required: boolean;
    auth_revocable: boolean;
    auth_immutable: boolean;
    auth_clawback_enabled: boolean;
  };
  signers: { key: string; weight: number; type: string }[];
  balances: {
    asset_type: string;
    asset_code?: string;
    asset_issuer?: string;
    balance: string;
    limit?: string;
  }[];
};

export type HorizonPort = {
  account(id: string): Promise<Result<HorizonAccount | null>>;
  firstOperation(accountId: string): Promise<Result<{ type: string; funder?: string } | null>>;
};
