import type { GameFlags, GameVars } from '../types';

export class FlagStore {
  private flags: GameFlags = {};
  private vars: GameVars = {};
  private inventory: string[] = [];

  constructor(initial?: { flags?: GameFlags; vars?: GameVars; inventory?: string[] }) {
    if (initial) {
      this.flags = { ...(initial.flags || {}) };
      this.vars = { ...(initial.vars || {}) };
      this.inventory = [...(initial.inventory || [])];
    }
  }

  getFlag(key: string): boolean {
    return !!this.flags[key];
  }

  setFlag(key: string, value: boolean) {
    this.flags[key] = value;
  }

  getVar(key: string): number {
    return this.vars[key] ?? 0;
  }

  setVar(key: string, value: number) {
    this.vars[key] = value;
  }

  hasItem(itemId: string): boolean {
    return this.inventory.includes(itemId);
  }

  giveItem(itemId: string) {
    if (!this.hasItem(itemId)) {
      this.inventory.push(itemId);
    }
  }

  removeItem(itemId: string) {
    this.inventory = this.inventory.filter(id => id !== itemId);
  }

  getInventory(): string[] {
    return [...this.inventory];
  }

  // For saving
  toJSON() {
    return {
      flags: { ...this.flags },
      vars: { ...this.vars },
      inventory: [...this.inventory],
    };
  }

  // For loading
  static fromJSON(data: any): FlagStore {
    return new FlagStore({
      flags: data?.flags,
      vars: data?.vars,
      inventory: data?.inventory,
    });
  }
}
