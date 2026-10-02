import type { Snapshot } from './snapshot';
import type { Summary } from './summary';

export const emptySummary = (snapshot: Snapshot): Summary => ({
  snapshot,
  contracts: {
    total: 0,
    families: 0,
    archivedInstances: 0,
    archivedMeaningful: 0,
    archivedByFamily: {},
    expiring30d: 0,
    expiring30dMeaningful: 0,
    expiring90d: 0,
    liveIdle: 0,
    scfFunded: { total: 0, archived: 0, expiring30d: 0, projects: [] },
  },
  failures: {
    windowStart: snapshot.snapshotTime,
    windowEnd: snapshot.snapshotTime,
    ledgersScanned: 0,
    txScanned: 0,
    txFailed: 0,
    byCode: {},
    preventable: { total: 0, byCode: {} },
    clusters: { count: 0, anchorDistribution: 0, domains: [] },
  },
  anchors: {
    domainsTested: 0,
    funnel: {
      tomlReachable: 0,
      signingKey: 0,
      endpoints: 0,
      infoReadable: 0,
      sep10: 0,
      testsPassed: 0,
    },
    perSep: {},
    failing: [],
  },
  rent: {
    contractsEstimated: 0,
    totalXlm12m: 0,
    medianXlm12m: 0,
    scfFundedXlm12m: 0,
    xlmUsd: { price: 0, source: 'none', at: snapshot.snapshotTime },
  },
  github: { byCategory: {}, recent: [] },
  findingsCount: {},
});
