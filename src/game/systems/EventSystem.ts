import type { MapWarp } from '../types';
import { FlagStore } from './FlagStore';

export type WarpCallback = (warp: MapWarp) => void;
export type DialogueCallback = (dialogueId: string) => void;
export type BattleCallback = (enemyId: string) => void;

export class EventSystem {
  private flagStore: FlagStore;
  private onWarp?: WarpCallback;
  private onDialogue?: DialogueCallback;
  private onBattle?: BattleCallback;

  constructor(flagStore: FlagStore) {
    this.flagStore = flagStore;
  }

  setWarpCallback(cb: WarpCallback) {
    this.onWarp = cb;
  }

  setDialogueCallback(cb: DialogueCallback) {
    this.onDialogue = cb;
  }

  setBattleCallback(cb: BattleCallback) {
    this.onBattle = cb;
  }

  // Called when player tries to interact with an object from the Events layer
  handleInteract(objProps: Record<string, any>) {
    const type = objProps.type as string | undefined;

    if (type === 'npc' || type === 'sign') {
      const dialogueId = this.resolveDialogueId(objProps);
      if (dialogueId && this.onDialogue) {
        this.onDialogue(dialogueId);
      }
      return;
    }

    if (type === 'warp') {
      const requires = objProps.requiresFlag as string | undefined;
      if (requires && !this.flagStore.getFlag(requires)) {
        const lockedId = objProps.lockedDialogueId as string | undefined;
        if (lockedId && this.onDialogue) this.onDialogue(lockedId);
        return;
      }

      const warp: MapWarp = {
        targetMap: objProps.targetMap,
        targetX: Number(objProps.targetX) || 0,
        targetY: Number(objProps.targetY) || 0,
      };
      if (this.onWarp) this.onWarp(warp);
      return;
    }

    if (type === 'battle') {
      const enemyId = objProps.enemyId as string || 'forest_spirit';
      if (this.onBattle) this.onBattle(enemyId);
      return;
    }

    if (type === 'chest') {
      const item = objProps.item as string | undefined;
      const requires = objProps.requiresFlag as string | undefined;

      if (requires && !this.flagStore.getFlag(requires)) {
        // TODO: show "locked" message via dialogue or temp text
        return;
      }

      if (item && !this.flagStore.hasItem(item)) {
        this.flagStore.giveItem(item);
        // In real game we would trigger a small "got item" dialogue
      }
    }
  }

  // Pick dialogue branch based on quest flags / inventory (data-driven via Tiled props)
  resolveDialogueId(props: Record<string, any>): string | undefined {
    const base = props.dialogueId as string | undefined;

    if (props.dialogueIdComplete && this.flagStore.getFlag('game_completed')) {
      return props.dialogueIdComplete;
    }

    // New story: Dima gives gift only after Lyudmila is defeated
    if (props.dialogueIdGift && this.flagStore.getFlag('lyudmila_defeated')) {
      return props.dialogueIdGift;
    }

    if (props.dialogueIdDefeated && this.flagStore.getFlag('lyudmila_defeated')) {
      return props.dialogueIdDefeated;
    }

    if (props.dialogueIdDefeated && this.flagStore.getFlag('vengr_defeated')) {
      return props.dialogueIdDefeated;
    }

    // Legacy support (kept for old maps if any)
    if (props.dialogueIdPostQuest && this.flagStore.getFlag('quest_key_completed')) {
      return props.dialogueIdPostQuest;
    }

    if (
      props.dialogueIdTurnIn &&
      this.flagStore.getFlag('quest_key_started') &&
      !this.flagStore.getFlag('quest_key_completed') &&
      this.flagStore.hasItem('ancient_key')
    ) {
      return props.dialogueIdTurnIn;
    }

    if (
      props.dialogueIdProgress &&
      this.flagStore.getFlag('quest_key_started') &&
      !this.flagStore.getFlag('quest_key_completed')
    ) {
      return props.dialogueIdProgress;
    }

    if (props.dialogueIdDefeated && this.flagStore.getFlag('spirit_defeated')) {
      return props.dialogueIdDefeated;
    }

    return base;
  }

  // Future: handle step-on events, etc.
}
