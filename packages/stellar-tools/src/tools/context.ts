import type { Storage } from '@harness/storage';
import type { ResultCodes } from '../explain/explain';

export type StorageContext = { storage: Storage };

export type DecodeContext = {
  decodeResultCodes?: (resultXdr: string) => ResultCodes | Promise<ResultCodes>;
  getTransaction?: (hash: string) => Promise<{ resultCodes: ResultCodes }>;
};

export type ToolContext = StorageContext & DecodeContext;

export type WithToolContext<TExtra> = ToolContext & TExtra;
