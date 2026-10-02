import { expect, it } from 'vitest';
import { SCANNER_VERSION } from './index';

it('exports a version', () => {
  expect(SCANNER_VERSION).toBe('0.0.0');
});
