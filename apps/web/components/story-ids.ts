const BASE32 = /[^A-Z2-7]/g;

const strkeyShaped = (prefix: 'G' | 'C', tag: string): string =>
  `${prefix}${`FAKE${tag.toUpperCase().replace(BASE32, '')}`.padEnd(55, 'A')}`.slice(0, 56);

export const fakeAccount = (tag: string): string => strkeyShaped('G', tag);

export const fakeContract = (tag: string): string => strkeyShaped('C', tag);

export const fakeHash = (tag: number): string => tag.toString(16).padStart(64, 'f');
