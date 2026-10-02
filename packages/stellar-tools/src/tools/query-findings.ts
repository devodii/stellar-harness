import type { StorageContext } from './context';
import { defineNamedTool } from './define';

export const queryFindings = defineNamedTool('queryFindings', (query, ctx: StorageContext) =>
  ctx.storage.queryFindings(query),
);
