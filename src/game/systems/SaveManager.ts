import type { SaveState } from '../types';

const SAVE_KEY = 'digame_save_v1';
const SAVE_VERSION = 1;

export class SaveManager {
  private currentSave: SaveState | null = null;

  load(): SaveState | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as SaveState;
      if (parsed.version !== SAVE_VERSION) {
        console.warn('Save version mismatch, ignoring old save.');
        return null;
      }
      this.currentSave = parsed;
      return parsed;
    } catch (e) {
      console.warn('Failed to load save:', e);
      return null;
    }
  }

  save(state: Partial<SaveState> & { mapKey: string; playerX: number; playerY: number; facing: SaveState['facing'] }) {
    const flags = state.flags ?? this.currentSave?.flags ?? {};
    const vars = state.vars ?? this.currentSave?.vars ?? {};
    const inventory = state.inventory ?? this.currentSave?.inventory ?? [];

    const saveData: SaveState = {
      version: SAVE_VERSION,
      mapKey: state.mapKey,
      playerX: state.playerX,
      playerY: state.playerY,
      facing: state.facing,
      flags,
      vars,
      inventory,
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      this.currentSave = saveData;
      return true;
    } catch (e) {
      console.error('Failed to save game:', e);
      return false;
    }
  }

  hasSave(): boolean {
    return !!localStorage.getItem(SAVE_KEY);
  }

  clearSave() {
    localStorage.removeItem(SAVE_KEY);
    this.currentSave = null;
  }

  // Helper to create initial state
  static createInitial(mapKey = 'chapel', x = 120, y = 104): SaveState {
    return {
      version: SAVE_VERSION,
      mapKey,
      playerX: x,
      playerY: y,
      facing: 'down',
      flags: {},
      vars: {},
      inventory: [],
    };
  }
}
