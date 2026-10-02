import { expect, it } from 'vitest';
import { STELLAR_TOOLS_VERSION } from './index';

it('exports a version', () => {
  expect(STELLAR_TOOLS_VERSION).toBe('0.0.0');
});
