import type { Dialogue, Effect } from '../types';
import { FlagStore } from './FlagStore';

export type DialogueEffectCallback = (effect: Effect) => void;

export class DialogueManager {
  private dialogues: Record<string, Dialogue> = {};
  private currentId: string | null = null;
  private currentPage = 0;
  private onEffect?: DialogueEffectCallback;
  private flagStore?: FlagStore;

  constructor(dialoguesData?: Record<string, Dialogue>, flagStore?: FlagStore) {
    if (dialoguesData) this.dialogues = dialoguesData;
    this.flagStore = flagStore;
  }

  loadDialogues(data: Record<string, Dialogue>) {
    this.dialogues = data;
  }

  setEffectCallback(cb: DialogueEffectCallback) {
    this.onEffect = cb;
  }

  setFlagStore(store: FlagStore) {
    this.flagStore = store;
  }

  start(id: string): boolean {
    if (!this.dialogues[id]) {
      console.warn(`Dialogue not found: ${id}`);
      return false;
    }
    this.currentId = id;
    this.currentPage = 0;
    return true;
  }

  getCurrentDialogue(): Dialogue | null {
    if (!this.currentId) return null;
    return this.dialogues[this.currentId] ?? null;
  }

  getCurrentPage() {
    const diag = this.getCurrentDialogue();
    if (!diag) return null;
    return diag.pages[this.currentPage] ?? null;
  }

  hasMorePages(): boolean {
    const diag = this.getCurrentDialogue();
    if (!diag) return false;
    return this.currentPage < diag.pages.length - 1;
  }

  getChoices() {
    const diag = this.getCurrentDialogue();
    if (!diag || this.hasMorePages()) return [];
    return diag.choices ?? [];
  }

  nextPage(): boolean {
    if (this.hasMorePages()) {
      this.currentPage++;
      return true;
    }
    return false;
  }

  selectChoice(index: number): { nextId?: string | null; finished: boolean } {
    const choices = this.getChoices();
    if (!choices[index]) {
      return { finished: true };
    }

    const choice = choices[index];

    // Apply effects
    if (choice.effects) {
      for (const effect of choice.effects) {
        this.applyEffect(effect);
      }
    }

    if (choice.next) {
      // Continue to another dialogue node
      const ok = this.start(choice.next);
      return { nextId: choice.next, finished: !ok };
    }

    // End of this dialogue branch
    this.currentId = null;
    this.currentPage = 0;
    return { finished: true };
  }

  private applyEffect(effect: Effect) {
    // Apply to FlagStore if available
    if (this.flagStore) {
      switch (effect.type) {
        case 'setFlag':
          this.flagStore.setFlag(effect.key, effect.value);
          break;
        case 'setVar':
          this.flagStore.setVar(effect.key, effect.value);
          break;
        case 'giveItem':
          this.flagStore.giveItem(effect.itemId);
          break;
        case 'removeItem':
          this.flagStore.removeItem(effect.itemId);
          break;
      }
    }

    // Notify external listener (for warp, battle, endGame, logging, etc.)
    if (this.onEffect) {
      this.onEffect(effect);
    }
  }

  isActive(): boolean {
    return !!this.currentId;
  }

  end() {
    this.currentId = null;
    this.currentPage = 0;
  }
}
