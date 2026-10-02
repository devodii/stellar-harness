import type { Result } from '../../schema';

export type HttpResponse = {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  ms: number;
  cached: boolean;
};

export type HttpRequest = {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
};

export type Fetcher = (url: string, init?: HttpRequest) => Promise<Result<HttpResponse>>;

export type Sleep = (ms: number) => Promise<void>;
