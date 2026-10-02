import { planForFinding } from '../plan/plan-fix';
import { fail } from '../tool';
import type { StorageContext } from './context';
import { defineNamedTool } from './define';

export const planFix = defineNamedTool('planFix', async ({ findingId }, ctx: StorageContext) => {
  const finding = await ctx.storage.getFinding(findingId);
  if (!finding) return fail('NOT_FOUND', `No finding with id ${findingId}`, { findingId });
  return planForFinding(finding);
});
