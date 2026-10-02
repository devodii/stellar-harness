import { describe, expect, it } from 'vitest';
import {
  cleanProjectName,
  decodeEntities,
  EM_DASH,
  isAnchorRelevant,
  parseRecapFeed,
  recapRounds,
} from './scf-recaps';
import { readFixture } from './testing';

const feed = readFixture('medium/stellar-community-feed.xml');

describe('parseRecapFeed', () => {
  const projects = parseRecapFeed(feed);

  it('reads projects from both recap markups and ignores other posts', () => {
    expect(projects.map((p) => [p.round, p.name])).toEqual([
      [45, 'Cara7'],
      [45, 'Pollar'],
      [45, 'Minisend'],
      [44, 'Lusty Finance'],
      [44, 'VERSO'],
    ]);
    expect(recapRounds(projects)).toEqual([44, 45]);
  });

  it('keeps anchor and ramp projects only when filtered', () => {
    expect(projects.filter(isAnchorRelevant).map((p) => p.name)).toEqual([
      'Pollar',
      'Minisend',
      'VERSO',
    ]);
  });

  it('records the recap url and a plain text description', () => {
    expect(projects[2]?.recapUrl).toMatch(/^https:\/\/medium\.com\/stellar-community\/scf-45/);
    expect(projects[2]?.description).toMatch(
      new RegExp(`^${EM_DASH} \\$100,000 worth of XLM\\* A Stellar anchor`),
    );
  });
});

describe('text helpers', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeEntities('A &amp; B &#8212; C &#x2019;s &bogus;')).toBe(
      `A & B ${EM_DASH} C ${String.fromCharCode(0x2019)}s &bogus;`,
    );
  });

  it('drops taglines after a dash', () => {
    expect(cleanProjectName('VERSO &#8212; Peru first regulated anchor')).toBe('VERSO');
    expect(cleanProjectName(`LumAgg ${EM_DASH} Stellar DEX Aggregator`)).toBe('LumAgg');
    expect(cleanProjectName('lomi.')).toBe('lomi.');
  });
});
