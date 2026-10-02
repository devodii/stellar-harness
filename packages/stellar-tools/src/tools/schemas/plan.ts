import { Plan } from '@harness/schema';
import { z } from 'zod';
import { FindingId } from './common';

export const PlanFixInput = z.object({ findingId: FindingId });
export type PlanFixInput = z.infer<typeof PlanFixInput>;

export const PlanFixOutput = Plan;
export type PlanFixOutput = z.infer<typeof PlanFixOutput>;
