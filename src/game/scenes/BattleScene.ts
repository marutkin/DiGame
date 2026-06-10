import Phaser from 'phaser';
import type { EnemyDef, SaveState } from '../types';
import { FlagStore } from '../systems/FlagStore';
import { SaveManager } from '../systems/SaveManager';
import { BattleUI, type BattleCommand } from '../ui/BattleUI';
import { SceneTransition } from '../ui/SceneTransition';
import { AudioManager } from '../systems/AudioManager';

interface BattleEnemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  defeatFlag?: string;
  loot: string[];
}

type BattlePhase = 'intro' | 'command' | 'busy' | 'end';

/**
 * Turn-based battle in classic SNES Final Fantasy style.
 * Command menu → message window → animations → enemy turn → repeat.
 */
export class BattleScene extends Phaser.Scene {
  private flagStore!: FlagStore;
  private saveManager = new SaveManager();
  private overworldSave!: SaveState;
  private ui!: BattleUI;
  private audio!: AudioManager;

  private playerHp = 20;
  private playerMaxHp = 20;
  private enemy!: BattleEnemy;

  private phase: BattlePhase = 'intro';
  private isDefending = false;

  private get partyName(): string {
    return this.flagStore?.getFlag('plusha_joined') ? 'Даша и Плюша' : 'Даша';
  }


  constructor() {
    super('BattleScene');
  }

  init(data: { enemyId?: string; flagStore?: FlagStore; overworldSave?: SaveState }) {
    this.overworldSave = data.overworldSave || SaveManager.createInitial();
    this.flagStore = data.flagStore || FlagStore.fromJSON(this.overworldSave);

    const enemyId = data.enemyId || 'forest_spirit';
    const enemyDefs = this.registry.get('enemies') as Record<string, EnemyDef> | undefined;
    const def = enemyDefs?.[enemyId];

    if (def) {
      this.enemy = {
        id: def.id,
        name: def.name,
        hp: def.hp,
        maxHp: def.hp,
        atk: def.atk,
        defeatFlag: def.defeatFlag,
        loot: def.loot ?? [],
      };
    } else {
      this.enemy = { id: enemyId, name: 'Неизвестный', hp: 8, maxHp: 8, atk: 3, loot: [] };
    }

    const savedHp = this.flagStore.getVar('player_hp');
    if (savedHp > 0) {
      this.playerHp = Math.min(savedHp, this.playerMaxHp);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#080818');
    this.audio = new AudioManager(this, this.registry.get('audio') || {});
    const sprites = this.registry.get('sprites') as Record<string, { sheet: string; frame: number }>;
    let enemySprite = sprites?.battle_enemy ?? sprites?.npc_spirit;
    if (this.enemy.id === 'lyudmila_konyukhova') {
      enemySprite = sprites?.enemy_ludmila ?? enemySprite;
    } else if (this.enemy.id === 'vengr') {
      enemySprite = sprites?.enemy_common ?? enemySprite;
    }

    const hasPlusha = this.flagStore.getFlag('plusha_joined');
    const partyName = hasPlusha ? 'Даша и Плюша' : 'Даша';

    this.ui = new BattleUI(this);
    this.ui.build(
      this.enemy.name,
      [{ name: partyName, hp: this.playerHp, maxHp: this.playerMaxHp }],
      enemySprite,
    );
    this.ui.updateEnemyHp(this.enemy.hp, this.enemy.maxHp);

    SceneTransition.fadeIn(this, 400);
    this.ui.showMessage(`${this.enemy.name} появился!`, () => this.beginPlayerTurn());
  }

  private beginPlayerTurn() {
    if (this.phase === 'end') return;
    this.phase = 'command';
    this.isDefending = false;

    const hasItems = this.flagStore.getInventory().length > 0;
    this.ui.showCommandMenu(
      [
        { id: 'attack', label: 'Атака', enabled: true },
        { id: 'defend', label: 'Защита', enabled: true },
        { id: 'item', label: 'Предмет', enabled: hasItems },
        { id: 'escape', label: 'Бегство', enabled: true },
      ],
      (cmd) => this.handleCommand(cmd),
    );
  }

  private handleCommand(cmd: BattleCommand) {
    if (this.phase !== 'command') return;
    this.phase = 'busy';

    switch (cmd) {
      case 'attack':
        this.resolveAttack();
        break;
      case 'defend':
        this.resolveDefend();
        break;
      case 'item':
        this.resolveItem();
        break;
      case 'escape':
        this.resolveEscape();
        break;
    }
  }

  private resolveAttack() {
    this.audio.play('attack');
    const hasPlusha = this.flagStore.getFlag('plusha_joined');
    const attackMsg = hasPlusha ? `${this.partyName} атакуют!` : `${this.partyName} атакует!`;
    this.ui.showMessage(attackMsg, () => {
      let dmg = 5 + Math.floor(Math.random() * 4);
      if (hasPlusha) dmg += 2; // Плюша помогает!
      this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
      this.ui.updateEnemyHp(this.enemy.hp, this.enemy.maxHp);

      this.ui.playAttackOnEnemy(() => {
        this.audio.play('hit');
        if (this.enemy.hp <= 0) {
          this.ui.showMessage(`${this.enemy.name} повержен!`, () => this.finishBattle(true));
        } else {
          this.ui.showMessage(`Нанесено ${dmg} урона!`, () => this.enemyTurn());
        }
      });
    });
  }

  private resolveDefend() {
    this.isDefending = true;
    this.ui.showMessage(`${this.partyName} принимает оборонительную стойку.`, () => this.enemyTurn());
  }

  private resolveItem() {
    const items = this.flagStore.getInventory();
    if (items.length === 0) {
      this.ui.showMessage('Нет предметов.', () => this.beginPlayerTurn());
      return;
    }

    const used = items[0];
    this.flagStore.removeItem(used);
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 6);
    this.ui.updatePartyHp(this.playerHp, this.playerMaxHp);

    this.ui.showMessage(`${this.partyName} использует «${used}».\nВосстановлено 6 HP.`, () => this.enemyTurn());
  }

  private resolveEscape() {
    const success = Math.random() < 0.35;
    if (success) {
      this.ui.showMessage('Удалось сбежать!', () => this.returnToOverworld(false));
    } else {
      this.ui.showMessage('Не удалось убежать!', () => this.enemyTurn());
    }
  }

  private enemyTurn() {
    if (this.phase === 'end') return;

    let enemyDmg = this.enemy.atk + Math.floor(Math.random() * 2);
    if (this.isDefending) enemyDmg = Math.max(1, Math.floor(enemyDmg * 0.35));

    this.audio.play('impact');
    this.ui.showMessage(`${this.enemy.name} атакует!`, () => {
      this.playerHp = Math.max(0, this.playerHp - enemyDmg);
      this.ui.updatePartyHp(this.playerHp, this.playerMaxHp);

      this.ui.playAttackOnPlayer(() => {
        if (this.playerHp <= 0) {
          this.ui.showMessage(`${this.partyName} пали...`, () => this.finishBattle(false));
        } else {
          this.ui.showMessage(`Получено ${enemyDmg} урона.`, () => this.beginPlayerTurn());
        }
      });
    });
  }

  private finishBattle(won: boolean) {
    this.phase = 'end';
    if (won) {
      if (this.enemy.defeatFlag) this.flagStore.setFlag(this.enemy.defeatFlag, true);
      for (const itemId of this.enemy.loot) this.flagStore.giveItem(itemId);

      this.ui.playEnemyDefeat(() => {
        this.audio.play('victory');
        const loot = this.enemy.loot.length > 0 ? `\nПолучено: ${this.enemy.loot.join(', ')}` : '';
        const victoryMsg = this.flagStore.getFlag('plusha_joined')
        ? `ПОБЕДА! Плюша гордо трясёт трофеем.${loot}`
        : `ПОБЕДА!${loot}`;
      this.ui.showMessage(victoryMsg, () => this.returnToOverworld(true));
      });
    } else {
      this.flagStore.setFlag('battle_lost', true);
      this.ui.showMessage('Поражение...', () => this.returnToOverworld(false));
    }
  }

  private returnToOverworld(_won: boolean) {
    const returnSave: SaveState = {
      ...this.overworldSave,
      flags: this.flagStore.toJSON().flags,
      vars: { ...this.flagStore.toJSON().vars, player_hp: this.playerHp },
      inventory: this.flagStore.getInventory(),
    };

    this.saveManager.save(returnSave);
    this.ui.destroy();
    this.scene.start('OverworldScene', { save: returnSave });
  }
}