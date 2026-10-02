// swap this file for a database adapter when orgs are real
import type { Action, Org } from '@harness/schema';

export interface Storage {
  getOrg(): Promise<Org>;
  listActions(): Promise<Action[]>;
  putAction(action: Action): Promise<void>;
}

export class MemoryStorage implements Storage {
  readonly #actions = new Map<string, Action>();

  constructor(private readonly org: Org) {}

  async getOrg(): Promise<Org> {
    return this.org;
  }

  async listActions(): Promise<Action[]> {
    return [...this.#actions.values()].reverse();
  }

  async putAction(action: Action): Promise<void> {
    this.#actions.set(action.id, action);
  }
}
