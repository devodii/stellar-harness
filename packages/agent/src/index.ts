import {
  applyApproval,
  demoExecutableSteps,
  INITIAL_PLAN_STATE,
  isTerminal,
  PLAN_TRANSITIONS,
  PlanApproval,
  PlanDecision,
  PlanEvent,
  parsePlanApproval,
  replay,
  transition,
} from './protocol';

export const planProtocol = {
  initialState: INITIAL_PLAN_STATE,
  transitions: PLAN_TRANSITIONS,
  transition,
  replay,
  isTerminal,
  applyApproval,
  parsePlanApproval,
  demoExecutableSteps,
  schemas: { PlanApproval, PlanDecision, PlanEvent },
} as const;

export * from './context';
export * from './protocol';
export * from './system';
export * from './tools';
