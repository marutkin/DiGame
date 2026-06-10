// Core game types for DiGame
// Keep this file small and focused on data that flows between systems/scenes.

export interface GameFlags {
  [key: string]: boolean;
}

export interface GameVars {
  [key: string]: number;
}

export interface SaveState {
  version: number;
  mapKey: string;
  playerX: number;
  playerY: number;
  facing: 'up' | 'down' | 'left' | 'right';
  flags: GameFlags;
  vars: GameVars;
  inventory: string[]; // item ids
}

export interface DialoguePage {
  speaker?: string;
  text: string;
}

export interface DialogueChoice {
  text: string;
  next?: string; // next dialogue id or special token
  effects?: Effect[];
}

export interface Dialogue {
  id: string;
  pages: DialoguePage[];
  choices?: DialogueChoice[];
}

export type Effect =
  | { type: 'setFlag'; key: string; value: boolean }
  | { type: 'setVar'; key: string; value: number }
  | { type: 'giveItem'; itemId: string }
  | { type: 'removeItem'; itemId: string }
  | { type: 'warp'; map: string; x: number; y: number }
  | { type: 'startBattle'; enemyId: string }
  | { type: 'endGame' };

export interface MapWarp {
  targetMap: string;
  targetX: number;
  targetY: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  atk: number;
  defeatFlag?: string;
  loot?: string[];
}

export interface ItemDef {
  name: string;
}
