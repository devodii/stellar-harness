import { expect, it } from 'vitest';
import { AGENT_VERSION } from './index';

it('exports a version', () => {
  expect(AGENT_VERSION).toBe('0.0.0');
});
