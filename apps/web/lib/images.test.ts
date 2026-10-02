import { describe, expect, it } from 'vitest';
import { fitWithin } from './images';

describe('fitWithin', () => {
  it('scales the longest side down to the limit', () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(1000, 3000, 1280)).toEqual({ width: 427, height: 1280 });
  });

  it('never upscales', () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });
});
