'use client';

import * as React from 'react';

const subscribe = () => () => {};

export const useMounted = (): boolean =>
  React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
