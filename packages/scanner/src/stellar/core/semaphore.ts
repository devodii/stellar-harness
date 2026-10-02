export type Release = () => void;

export class Semaphore {
  #limit: number;
  #active = 0;
  #waiters: Array<() => void> = [];

  constructor(limit: number) {
    if (!Number.isInteger(limit) || limit < 1) throw new RangeError(`Invalid limit: ${limit}`);
    this.#limit = limit;
  }

  get limit(): number {
    return this.#limit;
  }

  get active(): number {
    return this.#active;
  }

  get pending(): number {
    return this.#waiters.length;
  }

  setLimit(limit: number): void {
    if (!Number.isInteger(limit) || limit < 1) throw new RangeError(`Invalid limit: ${limit}`);
    this.#limit = limit;
    this.#drain();
  }

  async acquire(): Promise<Release> {
    if (this.#active < this.#limit) {
      this.#active += 1;
      return this.#releaser();
    }
    await new Promise<void>((resolve) => this.#waiters.push(resolve));
    return this.#releaser();
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await task();
    } finally {
      release();
    }
  }

  #releaser(): Release {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.#active -= 1;
      this.#drain();
    };
  }

  #drain(): void {
    while (this.#active < this.#limit && this.#waiters.length > 0) {
      this.#active += 1;
      this.#waiters.shift()?.();
    }
  }
}

export type HostLimiterOptions = {
  limits?: Record<string, number>;
  defaultLimit?: number;
  globalLimit?: number;
};

export class HostLimiter {
  readonly defaultLimit: number;
  #limits: Map<string, number>;
  #semaphores = new Map<string, Semaphore>();
  #global: Semaphore | null;

  constructor({ limits = {}, defaultLimit = 2, globalLimit }: HostLimiterOptions = {}) {
    this.defaultLimit = defaultLimit;
    this.#limits = new Map(Object.entries(limits));
    this.#global = globalLimit ? new Semaphore(globalLimit) : null;
  }

  limitFor(host: string): number {
    return this.#limits.get(host) ?? this.defaultLimit;
  }

  setLimit(host: string, limit: number): void {
    this.#limits.set(host, limit);
    this.#semaphores.get(host)?.setLimit(limit);
  }

  semaphoreFor(host: string): Semaphore {
    let semaphore = this.#semaphores.get(host);
    if (!semaphore) {
      semaphore = new Semaphore(this.limitFor(host));
      this.#semaphores.set(host, semaphore);
    }
    return semaphore;
  }

  async run<T>(host: string, task: () => Promise<T>): Promise<T> {
    const global = this.#global;
    return this.semaphoreFor(host).run(() => (global ? global.run(task) : task()));
  }
}
