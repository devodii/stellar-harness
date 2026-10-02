import type { Storage } from '@harness/storage';
import type { ResultCodes } from '../explain/explain';
import type { Policy } from '../plan/policy';

export type StorageContext = { storage: Storage };

export type PolicyContext = { policy: Policy };

export type DecodeContext = {
  decodeResultCodes?: (resultXdr: string) => ResultCodes | Promise<ResultCodes>;
  getTransaction?: (hash: string) => Promise<{ resultCodes: ResultCodes }>;
};

export type ToolContext = StorageContext & PolicyContext & DecodeContext;

export type WithToolContext<TExtra> = ToolContext & TExtra;
