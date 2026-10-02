'use client';

import * as React from 'react';
import { useNetwork } from '@/components/network-provider';
import { type ExplorerKind, explorerUrl, subjectHref } from '@/lib/links';

export const useExplorer = () => {
  const { network } = useNetwork();
  return React.useMemo(
    () => ({
      explorerUrl: (kind: ExplorerKind, id: string | number) => explorerUrl(kind, id, network),
      subjectHref: (subjectKind: string, subject: string) =>
        subjectHref(subjectKind, subject, network),
    }),
    [network],
  );
};
