export const MEDIUM_FEED_URL = 'https://medium.com/feed/stellar-community';
export const SCF_ROUNDS = [41, 42, 43, 44, 45] as const;

export type RecapProject = { round: number; name: string; description: string; recapUrl: string };

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return ENTITIES[entity.toLowerCase()] ?? match;
  });

const stripTags = (html: string): string => html.replace(/<[^>]+>/g, ' ');

const collapse = (text: string): string => text.replace(/\s+/g, ' ').trim();

export const EN_DASH = String.fromCharCode(0x2013);
export const EM_DASH = String.fromCharCode(0x2014);
const TAGLINE_SEPARATOR = new RegExp(`\\s+[-${EN_DASH}${EM_DASH}]\\s+`);

export const cleanProjectName = (raw: string): string =>
  collapse(decodeEntities(raw).split(TAGLINE_SEPARATOR)[0] ?? '');

const PROJECT =
  /<p><a href="https:\/\/communityfund\.stellar\.org\/[^"]+">([\s\S]*?)<\/a>([\s\S]*?)<\/p>/g;
const ITEM = /<item>([\s\S]*?)<\/item>/g;
const TITLE = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/;
const LINK = /<link>([\s\S]*?)<\/link>/;
const CONTENT = /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/;
const ROUND = /^SCF #(\d+) Round Recap/i;

export const parseRecapFeed = (xml: string): RecapProject[] =>
  [...xml.matchAll(ITEM)].flatMap(([, item = '']) => {
    const round = Number(item.match(TITLE)?.[1]?.trim().match(ROUND)?.[1] ?? Number.NaN);
    if (!Number.isInteger(round)) return [];
    const recapUrl = item.match(LINK)?.[1]?.trim() ?? '';
    const content = item.match(CONTENT)?.[1] ?? '';
    return [...content.matchAll(PROJECT)].flatMap(([, rawName = '', rest = '']) => {
      const name = cleanProjectName(stripTags(rawName));
      if (!name) return [];
      return [{ round, name, description: collapse(decodeEntities(stripTags(rest))), recapUrl }];
    });
  });

const ANCHOR_RELEVANT =
  /\banchors?\b|\bSEP-?(?:6|24|31|38)\b|\bon[- /]?ramps?\b|\boff[- /]?ramps?\b/i;

export const isAnchorRelevant = ({ name, description }: RecapProject): boolean =>
  ANCHOR_RELEVANT.test(`${name} ${description}`);

export const recapRounds = (projects: RecapProject[]): number[] =>
  [...new Set(projects.map((p) => p.round))].sort((a, b) => a - b);
