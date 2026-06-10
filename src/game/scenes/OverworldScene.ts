import Phaser from 'phaser';
import type { SaveState } from '../types';
import { FlagStore } from '../systems/FlagStore';
import { SaveManager } from '../systems/SaveManager';
import { DialogueManager, type DialogueEffectCallback } from '../systems/DialogueManager';
import { EventSystem } from '../systems/EventSystem';
import { MobileControls } from '../systems/MobileControls';
import { DialogueBoxUI } from '../ui/DialogueBoxUI';
import { GameHud } from '../ui/GameHud';
import { SceneTransition } from '../ui/SceneTransition';
import { AssetLoader } from '../assets/AssetLoader';
import { AudioManager } from '../systems/AudioManager';
import { UiCamera } from '../ui/UiCamera';

/**
 * OverworldScene — main world exploration scene.
 *
 * Uses clean systems:
 * - FlagStore for flags/vars/inventory
 * - DialogueManager for pages + choices + effects
 * - EventSystem for map object interactions (warp, npc dialogue, chest...)
 * - SaveManager for persistence
 *
 * Supports receiving initial save state from TitleScene and can reload different maps.
 */
export class OverworldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private initialSave!: SaveState;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private actionKey!: Phaser.Input.Keyboard.Key;

  private map!: Phaser.Tilemaps.Tilemap;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer | null;
  private wallsLayer!: Phaser.Tilemaps.TilemapLayer;
  private waterTileId = 0;

  private tileSize = 16;
  private isMoving = false;
  private isWarping = false;
  private facing: SaveState['facing'] = 'down';

  private flagStore!: FlagStore;
  private saveManager = new SaveManager();
  private dialogueManager!: DialogueManager;
  private eventSystem!: EventSystem;
  private mobileControls!: MobileControls;

  private currentMapKey = 'village';
  private interactables: Array<{ x: number; y: number; width: number; height: number; props: Record<string, any> }> = [];

  private dialogueUI!: DialogueBoxUI;
  private gameHud!: GameHud;
  private audio!: AudioManager;
  private uiCamera!: UiCamera;
  private worldObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('OverworldScene');
  }

  init(data?: { save?: SaveState; mapKey?: string }) {
    // Initialize state from TitleScene or previous map warp
    this.initialSave = data?.save || new SaveManager().load() || SaveManager.createInitial('village', 152, 168);
    this.currentMapKey = data?.mapKey || this.initialSave.mapKey || 'village';

    this.flagStore = FlagStore.fromJSON(this.initialSave);
    this.facing = this.initialSave.facing || 'down';

    this.dialogueManager = new DialogueManager();
    this.dialogueUI = new DialogueBoxUI(this);
    this.eventSystem = new EventSystem(this.flagStore);

    // Wire callbacks
    this.dialogueManager.setFlagStore(this.flagStore);

    const effectCb: DialogueEffectCallback = (effect) => {
      if (effect.type === 'warp') {
        this.handleWarp({ targetMap: effect.map, targetX: effect.x || 3, targetY: effect.y || 3 });
      }
      if (effect.type === 'startBattle') {
        this.startBattle(effect.enemyId || 'forest_spirit');
      }
      if (effect.type === 'endGame') {
        this.quickSave();
        SceneTransition.fadeOut(this, 500).then(() => {
          this.scene.start('EndingScene');
        });
      }
    };
    this.dialogueManager.setEffectCallback(effectCb);

    this.eventSystem.setDialogueCallback((dialogueId) => {
      this.startDialogue(dialogueId);
    });

    this.eventSystem.setWarpCallback((warp) => {
      this.handleWarp(warp);
    });

    this.eventSystem.setBattleCallback((enemyId) => {
      this.startBattle(enemyId);
    });
  }

  preload() {
    // Load the current map
    this.load.tilemapTiledJSON(this.currentMapKey, `assets/maps/${this.currentMapKey}.json`);

    // Dialogues should already be in registry from PreloadScene, but fallback
    if (!this.registry.get('dialogues')) {
      this.load.json('dialogues', 'assets/data/dialogues.json');
    }
  }

  create() {
    const dialogues = this.registry.get('dialogues') || this.cache.json.get('dialogues') || {};
    this.dialogueManager.loadDialogues(dialogues);

    this.cameras.main.setBackgroundColor('#1a3828');

    this.map = this.make.tilemap({ key: this.currentMapKey });
    this.tileSize = this.map.tileWidth;

    const tilesetsCfg = this.registry.get('tilesets') as Record<string, {
      key: string;
      collision: number;
      tiles?: { water?: number };
    }>;
    const tileCfg = tilesetsCfg[this.currentMapKey];
    const tilesetKey = tileCfg?.key ?? 'town';
    const collisionId = tileCfg?.collision ?? 1;
    this.waterTileId = tileCfg?.tiles?.water ?? 0;

    const tileset = this.map.addTilesetImage(tilesetKey, tilesetKey, this.tileSize, this.tileSize)!;

    this.groundLayer = this.map.createLayer('Ground', tileset, 0, 0);
    this.wallsLayer = this.map.createLayer('Walls', tileset, 0, 0)!;

    if (this.groundLayer) {
      this.groundLayer.setDepth(0);
      this.markWorld(this.groundLayer);
    }
    if (this.wallsLayer) {
      this.wallsLayer.setDepth(1);
      this.wallsLayer.setCollision([collisionId]);
      this.markWorld(this.wallsLayer);
    }

    const warpX = this.registry.get('playerX') as number | undefined;
    const warpY = this.registry.get('playerY') as number | undefined;
    const startX = warpX ?? this.initialSave.playerX;
    const startY = warpY ?? this.initialSave.playerY;
    if (warpX !== undefined) this.registry.remove('playerX');
    if (warpY !== undefined) this.registry.remove('playerY');

    const spawn = this.findSafeSpawn(startX, startY);
    const sprites = this.registry.get('sprites') as Record<string, any>;
    const playerCfg = sprites?.player || {};
    let playerKey = playerCfg.texture || 'characters';
    let initialFrame: number | undefined;
    if (!playerCfg.texture && playerCfg.sheet) {
      playerKey = playerCfg.sheet;
      initialFrame = playerCfg.walkFrames?.down?.[0] ?? 0;
    }
    this.player = this.add.sprite(spawn.x, spawn.y, playerKey, initialFrame).setDepth(10);
    if (playerCfg.texture) {
      this.player.setDisplaySize(this.tileSize, this.tileSize);
    }
    this.markWorld(this.player);

    const idleKey = `player-idle-${this.facing}`;
    if (this.player.anims?.exists(idleKey)) {
      this.player.play(idleKey);
    }
    if (spawn.x !== startX || spawn.y !== startY) {
      console.warn('Adjusted player spawn to safe position', { requested: [startX, startY], adjusted: [spawn.x, spawn.y] });
      this.quickSave();
    }

    this.physics.add.existing(this.player, false);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(12, 12);
    body.setOffset(2, 2);

    if (this.wallsLayer) {
      this.physics.add.collider(this.player, this.wallsLayer);
    }

    // Input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // Camera (zoomed world view — UI uses a separate camera)
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setZoom(1.5);

    // Parse Events
    this.parseEventsLayer();

    this.uiCamera = new UiCamera(this);
    this.registry.set('uiCamera', this.uiCamera);
    this.uiCamera.hideFromUi(...this.worldObjects);

    // Mobile virtual controls
    this.mobileControls = new MobileControls(this);
    this.mobileControls.create(() => {
      if (!this.dialogueManager.isActive() && !this.dialogueUI.isActive()) {
        this.tryInteract();
      }
    });
    this.uiCamera.showOnUi(this.mobileControls.getRoot());

    this.audio = new AudioManager(this, this.registry.get('audio') || {});
    this.gameHud = new GameHud(this);
    this.gameHud.create(
      () => this.getMapDisplayName(),
      () => this.getQuestHint(),
      () => this.getInventoryLine(),
    );
    this.uiCamera.showOnUi(this.gameHud.getRoot());

    // Quick save on P
    this.input.keyboard?.on('keydown-P', () => {
      this.quickSave();
      this.showSaveToast();
    });

    // Auto-save on scene shutdown (e.g. warp)
    this.events.on('shutdown', () => {
      if (!this.isWarping) {
        this.quickSave();
      }
      if (this.mobileControls) this.mobileControls.destroy();
      if (this.dialogueUI) this.dialogueUI.destroy();
      if (this.gameHud) this.gameHud.destroy();
    });

    SceneTransition.fadeIn(this, 400);
  }

  update(_time: number, _delta: number) {
    if (!this.player || !this.cursors || this.isMoving || this.dialogueManager.isActive() || this.dialogueUI.isActive()) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    let dx = 0;
    let dy = 0;
    let newFacing: typeof this.facing | null = null;

    const left = this.cursors?.left.isDown || this.mobileControls?.isDown('left');
    const right = this.cursors?.right.isDown || this.mobileControls?.isDown('right');
    const up = this.cursors?.up.isDown || this.mobileControls?.isDown('up');
    const down = this.cursors?.down.isDown || this.mobileControls?.isDown('down');

    if (left) { dx = -1; newFacing = 'left'; }
    else if (right) { dx = 1; newFacing = 'right'; }
    else if (up) { dy = -1; newFacing = 'up'; }
    else if (down) { dy = 1; newFacing = 'down'; }

    if ((dx !== 0 || dy !== 0) && newFacing) {
      this.facing = newFacing;

      const ts = this.tileSize;
      const targetX = this.player.x + dx * ts;
      const targetY = this.player.y + dy * ts;

      if (!this.isBlocked(targetX, targetY)) {
        this.isMoving = true;
        body.setVelocity(0, 0);

        const walkKey = `player-walk-${newFacing}`;
        if (this.player.anims?.exists(walkKey)) {
          this.player.play(walkKey, true);
        }
        this.tweens.add({
          targets: this.player,
          x: targetX,
          y: targetY,
          duration: 160,
          ease: 'Linear',
          onComplete: () => {
            this.isMoving = false;
            const idleKey = `player-idle-${this.facing}`;
            if (this.player.anims?.exists(idleKey)) {
              this.player.play(idleKey);
            }
            this.audio.play('footstep');
          },
        });
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.actionKey)) {
      this.tryInteract();
    }

    if (!this.isMoving) {
      const idleKey = `player-idle-${this.facing}`;
      if (this.player.anims?.exists(idleKey)) {
        this.player.play(idleKey);
      }
    }
  }

  // === Map & Events ===

  private markWorld(...objects: Phaser.GameObjects.GameObject[]) {
    this.worldObjects.push(...objects);
  }

  private parseEventsLayer() {
    this.interactables = [];
    const eventsLayer = this.map.getObjectLayer('Events');
    if (!eventsLayer) return;

    eventsLayer.objects.forEach((obj) => {
      const props: Record<string, any> = {};
      (obj.properties || []).forEach((p: any) => { props[p.name] = p.value; });

      this.interactables.push({
        x: obj.x || 0,
        y: obj.y || 0,
        width: obj.width || this.tileSize,
        height: obj.height || this.tileSize,
        props,
      });

      const cx = (obj.x || 0) + this.tileSize / 2;
      const cy = (obj.y || 0) + this.tileSize / 2;

      if (props.type === 'npc') {
        const defeated = props.dialogueIdDefeated &&
          (this.flagStore.getFlag('spirit_defeated') ||
           this.flagStore.getFlag('vengr_defeated') ||
           this.flagStore.getFlag('lyudmila_defeated'));
        if (!defeated) {
          const spriteKey = (props.sprite as string) || 'npc_villager';
          const sprites = this.registry.get('sprites') as Record<string, any>;
          const npcData = AssetLoader.getNpcFrame(sprites, spriteKey);
          let npc: Phaser.GameObjects.Sprite;
          if (npcData.frame !== undefined) {
            npc = this.add.sprite(cx, cy, npcData.key, npcData.frame).setDepth(5);
          } else {
            npc = this.add.sprite(cx, cy, npcData.key).setDepth(5);
            npc.setDisplaySize(this.tileSize, this.tileSize);
          }
          this.markWorld(npc);
        }
      }
      if (props.type === 'sign') {
        const post = this.add.graphics().setDepth(4);
        post.fillStyle(0x6a4a28, 1);
        post.fillRect(cx - 2, cy - 4, 4, 10);
        post.fillStyle(0x8a6a40, 1);
        post.fillRect(cx - 6, cy - 8, 12, 6);
        this.markWorld(post);
      }
      if (props.type === 'warp') {
        const portal = this.add.sprite(cx, cy, 'portal').setDepth(4).setAlpha(0.85);
        this.tweens.add({ targets: portal, alpha: 0.45, duration: 900, yoyo: true, repeat: -1 });
        this.markWorld(portal);
      }
    });
  }

  private tryInteract() {
    if (this.dialogueManager.isActive()) return;

    const ts = this.tileSize;
    const px = this.player.x;
    const py = this.player.y;
    const range = ts * 1.2;

    for (const obj of this.interactables) {
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;
      if (Phaser.Math.Distance.Between(px, py, cx, cy) < range) {
        this.eventSystem.handleInteract(obj.props);
        return;
      }
    }
  }

  private handleWarp(warp: { targetMap: string; targetX?: number; targetY?: number }) {
    const targetX = (warp.targetX ?? 3) * this.tileSize + this.tileSize / 2;
    const targetY = (warp.targetY ?? 3) * this.tileSize + this.tileSize / 2;

    this.currentMapKey = warp.targetMap;
    this.isWarping = true;
    this.player.setPosition(targetX, targetY);
    this.quickSave();

    this.registry.set('playerX', targetX);
    this.registry.set('playerY', targetY);

    this.audio.play('warp');
    SceneTransition.fadeOut(this, 280).then(() => {
      this.scene.restart({ mapKey: warp.targetMap });
    });
  }

  private isBlocked(worldX: number, worldY: number): boolean {
    const half = this.tileSize / 2;
    const margin = this.tileSize * 0.3;
    const samples = [
      { x: worldX, y: worldY },
      { x: worldX - margin, y: worldY },
      { x: worldX + margin, y: worldY },
      { x: worldX, y: worldY - margin },
      { x: worldX, y: worldY + margin },
    ];

    for (const p of samples) {
      if (p.x < half || p.y < half || p.x >= this.map.widthInPixels - half || p.y >= this.map.heightInPixels - half) {
        return true;
      }

      const wallTile = this.wallsLayer.getTileAtWorldXY(p.x, p.y, true);
      if (wallTile?.collides) return true;

      if (this.waterTileId > 0 && this.groundLayer) {
        const groundTile = this.groundLayer.getTileAtWorldXY(p.x, p.y, true);
        if (groundTile && groundTile.index === this.waterTileId) return true;
      }
    }

    return false;
  }

  private findSafeSpawn(startX: number, startY: number) {
    if (!this.isBlocked(startX, startY)) {
      return { x: startX, y: startY };
    }

    const tileX = Math.round((startX - this.tileSize / 2) / this.tileSize);
    const tileY = Math.round((startY - this.tileSize / 2) / this.tileSize);
    const maxRadius = 4;

    for (let radius = 1; radius <= maxRadius; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const candidateX = (tileX + dx) * this.tileSize + this.tileSize / 2;
          const candidateY = (tileY + dy) * this.tileSize + this.tileSize / 2;
          if (!this.isBlocked(candidateX, candidateY)) {
            return { x: candidateX, y: candidateY };
          }
        }
      }
    }

    return { x: startX, y: startY };
  }

  // === Dialogue (now using DialogueManager) ===

  private startDialogue(id: string) {
    if (!this.dialogueManager.start(id)) return;

    this.showCurrentDialoguePage();
  }

  private showCurrentDialoguePage() {
    const page = this.dialogueManager.getCurrentPage();
    if (!page) {
      this.dialogueUI.destroy();
      return;
    }

    const hasMore = this.dialogueManager.hasMorePages();
    const choices = this.dialogueManager.getChoices();

    if (hasMore) {
      this.dialogueUI.showPage(page, 'advance', [], {
        onAdvance: () => {
          this.audio.play('dialogue');
          this.dialogueManager.nextPage();
          this.showCurrentDialoguePage();
        },
      });
    } else if (choices.length > 0) {
      this.dialogueUI.showPage(
        page,
        'choices',
        choices.map(c => ({ text: c.text })),
        {
          onChoice: (index) => this.chooseDialogueOption(index),
        },
      );
    } else {
      this.dialogueUI.showPage(page, 'close', [], {
        onClose: () => {
          this.dialogueUI.destroy();
          this.dialogueManager.end();
          this.quickSave();
        },
      });
    }

    const dlgRoot = this.dialogueUI.getRoot();
    if (dlgRoot) this.uiCamera.showOnUi(dlgRoot);
  }

  private chooseDialogueOption(index: number) {
    const result = this.dialogueManager.selectChoice(index);
    this.dialogueUI.destroy();

    if (result.nextId) {
      this.startDialogue(result.nextId);
    } else {
      this.dialogueManager.end();
      this.quickSave();
    }
  }

  // === Save ===

  private quickSave() {
    if (!this.player) return;

    this.saveManager.save({
      mapKey: this.currentMapKey,
      playerX: Math.round(this.player.x),
      playerY: Math.round(this.player.y),
      facing: this.facing,
      flags: this.flagStore.toJSON().flags,
      vars: this.flagStore.toJSON().vars,
      inventory: this.flagStore.getInventory(),
    });
  }

  private startBattle(enemyId: string) {
    const save = this.buildCurrentSave();
    this.saveManager.save(save);

    SceneTransition.fadeOut(this, 350).then(() => {
      this.scene.start('BattleScene', {
        enemyId,
        flagStore: this.flagStore,
        overworldSave: save,
      });
    });
  }

  private buildCurrentSave(): SaveState {
    return {
      version: 1,
      mapKey: this.currentMapKey,
      playerX: Math.round(this.player.x),
      playerY: Math.round(this.player.y),
      facing: this.facing,
      flags: this.flagStore.toJSON().flags,
      vars: this.flagStore.toJSON().vars,
      inventory: this.flagStore.getInventory(),
    };
  }

  private getMapDisplayName(): string {
    const maps = this.registry.get('maps') as Record<string, { name: string }> | undefined;
    return maps?.[this.currentMapKey]?.name ?? this.currentMapKey;
  }

  private getQuestHint(): string {
    if (this.flagStore.getFlag('game_completed')) return '✦ День рождения удался';
    if (this.flagStore.getFlag('lyudmila_defeated')) return '▸ Вернись к Диме за подарком';
    if (this.flagStore.getFlag('vengr_defeated')) return '▸ Иди в Логово и разберись с тварью';
    if (this.flagStore.getFlag('plusha_joined')) return '▸ Найди и победи злых Венгров';
    if (this.flagStore.getFlag('quest_started')) return '▸ Выходи во двор — Плюша ждёт';
    return '▸ Прочитай записку от Димы';
  }

  private getInventoryLine(): string {
    const items = this.flagStore.getInventory();
    const hasPlusha = this.flagStore.getFlag('plusha_joined');
    const itemStr = items.length > 0 ? items.map(id => this.getItemName(id)).join(', ') : '';
    if (hasPlusha && itemStr) return `Плюша + ${itemStr}`;
    if (hasPlusha) return 'Плюша';
    return itemStr;
  }

  private showSaveToast() {
    const { width } = this.scale;
    const toast = this.add.text(width / 2, 56, 'Сохранено', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#aaffaa',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(250).setAlpha(0);
    this.uiCamera?.showOnUi(toast);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      duration: 150,
      yoyo: true,
      hold: 600,
      onComplete: () => toast.destroy(),
    });
  }

  private getItemName(itemId: string): string {
    const items = this.registry.get('items') as Record<string, { name: string }> | undefined;
    return items?.[itemId]?.name ?? itemId;
  }
}
