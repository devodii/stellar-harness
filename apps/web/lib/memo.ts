export const memo = <T>(load: () => T): (() => T) => {
  let loaded = false;
  let value: T;
  return () => {
    if (!loaded) {
      value = load();
      loaded = true;
    }
    return value;
  };
};

export interface TtlCache<T> {
  get: (load: () => Promise<T>) => Promise<T>;
  clear: () => void;
}

export const ttlCache = <T>(ttlMs: number, now: () => number = Date.now): TtlCache<T> => {
  let entry: { at: number; value: Promise<T> } | null = null;
  return {
    get: (load) => {
      if (entry && now() - entry.at < ttlMs) return entry.value;
      const value = load();
      const current = { at: now(), value };
      entry = current;
      value.catch(() => {
        if (entry === current) entry = null;
      });
      return value;
    },
    clear: () => {
      entry = null;
    },
  };
};
