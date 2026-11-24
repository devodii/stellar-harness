import type { Org } from '@harness/schema';

export const DEMO_ORG: Org = {
  id: 'demo-treasury',
  name: 'Demo Treasury Ltd',
  network: 'testnet',
  accounts: [
    {
      address: 'GDG4ULPBFQ4XF27ZUMQFJ7LSRPNMZLLCQDJWRV7PZZPEEQ7IGCHPQMK6',
      label: 'Treasury',
      role: 'treasury',
    },
    {
      address: 'GD7DV4D2W65SZ6IAXDLT24QL7O7BCOG2R5MACOOOQZ4P2GRXOXUKZOIK',
      label: 'Distribution',
      role: 'distribution',
    },
  ],
  contracts: [
    { id: 'CAOALF2VU3JIFFVCNKBE36L7D2LI23VS36BB5H7CF6CAFTWTB24STRI6', label: 'Escrow' },
    { id: 'CBRSCFRPCMKZCUTJMOVU5XQWZVXXSM66MGB4CEFRT5KWDI4XLM44DK5M', label: 'Registry' },
  ],
  policy: {
    dailySpendXlm: 50,
    allowedOperations: ['extend_ttl', 'restore', 'sponsor_trustline', 'payment'],
    approvalAboveXlm: 10,
  },
};
