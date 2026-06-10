/**
 * DialogueSystem.ts
 * 
 * Лёгкая обёртка над JSON-диалогами.
 * В текущей версии основная работа происходит в DialogueScene.
 * Этот класс полезен если понадобится запускать диалоги из разных мест.
 */

import dialoguesRaw from '../../data/dialogues.json';

export interface DialogueLine {
  text: string;
}

export interface DialogueChoice {
  text: string;
  next: string;
}

export interface Dialogue {
  id: string;
  speaker: string;
  portrait: string;
  lines: DialogueLine[];
  choices?: DialogueChoice[];
  end?: boolean;
  flags?: Record<string, any>;
}

export class DialogueSystem {
  private dialogues: Record<string, Dialogue>;

  constructor() {
    this.dialogues = (dialoguesRaw as any).dialogues;
  }

  getDialogue(id: string): Dialogue | undefined {
    return this.dialogues[id];
  }

  getAllIds(): string[] {
    return Object.keys(this.dialogues);
  }
}
