/**
 * WorldScene.ts — основной игровой мир (линейный уровень).
 * 
 * Особенности:
 * - Линейная карта (деревня → лес → дорога → зона босса)
 * - Управление: виртуальный джойстик (тач) + WASD/стрелки
 * - Игрок (Даша) + простые NPC
 * - Триггерные зоны: диалоги и бои
 * - Камера следует за игроком
 * - Сохранение состояния квеста
 */

import Phaser from 'phaser';
import { VirtualJoystick } from '../utils/VirtualJoystick';

interface QuestState {
  questStarted: boolean;
  dimaJoined: boolean;
  plyushaJoined: boolean;
  enemiesDefeated: number;
  bossDefeated: boolean;
  gameFinished: boolean;
  partyHP: { dasha: number; dima: number; plusha: number };
  items: { healingPotion: number; energyDrink: number };
}

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private joystick!: VirtualJoystick;

  private npcs: Phaser.GameObjects.Sprite[] = [];
  private triggers: Phaser.GameObjects.Zone[] = [];

  // Following party members (after quest)
  private dimaSprite?: Phaser.GameObjects.Sprite;
  private plushaSprite?: Phaser.GameObjects.Sprite;
  private playerTrail: { x: number; y: number }[] = [];

  // Visible enemies that can aggro
  private worldEnemies: Array<{
    sprite: Phaser.GameObjects.Sprite;
    triggered: boolean;
    aggroRange?: number;
  }> = [];

  private speed = 140;
  private questState!: QuestState;

  // Для предотвращения повторного запуска одного и того же диалога/боя
  private triggered: Set<string> = new Set();

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    // === Загружаем состояние ===
    this.questState = this.registry.get('questState') as QuestState;

    // === Создаём мир ===
    this.createWorldMap();

    // === Игрок (Даша) ===
    this.createPlayer();

    // === NPC ===
    this.createNPCs();

    // === Триггеры ===
    this.createTriggers();

    // === Видимые враги (венгры), которые могут нападать ===
    this.createWorldEnemies();

    // Если квест уже выполнен в сохранении — сразу ставим спутников в формацию
    if (this.questState.dimaJoined && this.dimaSprite) {
      this.dimaSprite.x = this.player.x - 52;
      this.dimaSprite.y = this.player.y + 8;
      this.dimaSprite.setFlipX(false);
    }
    if (this.questState.plyushaJoined && this.plushaSprite) {
      this.plushaSprite.x = this.player.x - 70;
      this.plushaSprite.y = this.player.y - 2;
      this.plushaSprite.setFlipX(false);
    }

    // === Управление ===
    this.setupControls();

    // === Камера ===
    this.cameras.main.setBounds(0, 0, 1600, 720);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.0);

    // === UI подсказка (внизу) ===
    this.createMobileHint();

    // === Сохранение при выходе со сцены ===
    this.events.on('shutdown', () => this.saveState());
  }

  private createWorldMap(): void {
    const mapWidth = 50;   // тайлов
    const mapHeight = 18;
    const tileSize = 32;

    // Фон — тёмная земля
    this.add.rectangle(0, 0, mapWidth * tileSize, mapHeight * tileSize, 0x1a1423)
      .setOrigin(0, 0);

    // Создаём слой тайлов
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const worldX = x * tileSize + tileSize / 2;
        const worldY = y * tileSize + tileSize / 2;

        let tileKey = 'tile_grass';

        // Линейная тропинка посередине (примерно по Y = 8-10)
        if (y >= 7 && y <= 10) {
          tileKey = 'tile_path';
        } else if (y === 6 || y === 11) {
          // Края тропинки иногда с цветами
          tileKey = Math.random() > 0.6 ? 'tile_grass_flowers' : 'tile_grass';
        }

        // Немного случайности на траве
        if (tileKey === 'tile_grass' && Math.random() < 0.25) {
          tileKey = 'tile_grass_flowers';
        }

        const tile = this.add.image(worldX, worldY, tileKey);
        tile.setDisplaySize(tileSize, tileSize);
      }
    }

    // Декорации: "деревья", кусты, заборы
    this.createDecorations(mapWidth, mapHeight, tileSize);

    // Границы мира (невидимые стены)
    const worldBounds = this.physics.world.bounds;
    worldBounds.width = mapWidth * tileSize;
    worldBounds.height = mapHeight * tileSize;

    // Верхняя и нижняя "стена" (заборы)
    for (let x = 0; x < mapWidth; x += 2) {
      const wx = x * tileSize + 16;
      this.add.image(wx, 3 * tileSize, 'tile_wall').setDisplaySize(tileSize, tileSize);
      this.add.image(wx, 14 * tileSize, 'tile_wall').setDisplaySize(tileSize, tileSize);
    }
  }

  private createDecorations(mapW: number, mapH: number, ts: number): void {
    // Деревья слева и справа от тропы
    const treePositions = [
      { x: 3, y: 4 }, { x: 5, y: 3 }, { x: 8, y: 5 },
      { x: 12, y: 3 }, { x: 15, y: 4 },
      { x: 28, y: 3 }, { x: 31, y: 5 }, { x: 35, y: 3 },
      { x: 40, y: 4 }, { x: 44, y: 3 }
    ];

    treePositions.forEach(pos => {
      const tx = pos.x * ts + ts / 2;
      const ty = pos.y * ts + ts / 2;
      const tree = this.add.ellipse(tx, ty, 28, 38, 0x1f3f2a, 0.9);
      tree.setStrokeStyle(3, 0x14291c);
      // Добавляем "ствол"
      this.add.rectangle(tx, ty + 14, 8, 18, 0x3a2f2a);
    });

    // Несколько камней
    const rocks = [
      { x: 7, y: 12 }, { x: 19, y: 13 }, { x: 33, y: 12 }, { x: 47, y: 11 }
    ];
    rocks.forEach(r => {
      const rx = r.x * ts + 16;
      const ry = r.y * ts + 18;
      this.add.ellipse(rx, ry, 22, 14, 0x4a4035);
    });

    // Указатель "Вперёд" недалеко от старта
    const sign = this.add.text(6 * ts, 8.5 * ts, '→ К Диме', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#e8d5b7'
    }).setOrigin(0.5);
  }

  private createPlayer(): void {
    // Стартуем игрока в начале тропы
    const startX = 120;
    const startY = 280;

    // Используем аватар Даши.
    // ВАЖНО: avatar.png — это одиночное изображение (не спрайтшит с кадрами).
    // Поэтому мы загружаем его как image и просто масштабируем до разумного размера для мира.
    this.player = this.add.sprite(startX, startY, 'dasha_avatar');

    // Сохраняем пропорции оригинальной картинки (не растягиваем в ширину)
    // Увеличено в 2 раза по сравнению с предыдущей версией
    this.player.setOrigin(0.5, 0.78);
    const targetH = 80;
    const sc = targetH / this.player.height;
    this.player.setScale(sc);

    // Физика — пропорционально увеличенному размеру
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(36, 42);
    body.setOffset(22, 28);

    // Глубина (для сортировки по Y)
    this.player.setDepth(10);
  }

  private createNPCs(): void {
    // Дима — стоит чуть дальше по тропе. После квеста он будет следовать за Дашей.
    const dima = this.add.sprite(380, 275, 'dima_avatar');
    dima.setOrigin(0.5, 0.78);
    const npcScale = 76 / dima.height;  // увеличено в 2 раза
    dima.setScale(npcScale);
    dima.setData('id', 'dima');
    dima.setData('name', 'Дима');
    dima.setDepth(9);
    this.dimaSprite = dima;
    this.npcs.push(dima);

    // Плюша — появляется дальше. После присоединения следует за игроком.
    // Делаем её меньше, потому что это собака.
    const plusha = this.add.sprite(680, 290, 'plusha_avatar');
    plusha.setOrigin(0.5, 0.78);
    const plushaScale = 55 / plusha.height;
    plusha.setScale(plushaScale);
    plusha.setData('id', 'plusha');
    plusha.setData('name', 'Плюша');
    plusha.setDepth(9);
    this.plushaSprite = plusha;
    this.npcs.push(plusha);

    // Подписи убраны — после присоединения они идут за Дашей и не стоят на месте
  }

  private createTriggers(): void {
    // Зона разговора с Димой
    const dimaTrigger = this.add.zone(380, 275, 90, 70);
    dimaTrigger.setData('id', 'dima_meet');
    dimaTrigger.setData('type', 'dialogue');
    this.physics.add.existing(dimaTrigger, true);
    this.triggers.push(dimaTrigger);

    // Зона встречи с Плюшей (только после того, как поговорили с Димой)
    const plushaTrigger = this.add.zone(680, 290, 80, 70);
    plushaTrigger.setData('id', 'plyusha_meet');
    plushaTrigger.setData('type', 'dialogue');
    plushaTrigger.setData('requires', 'questStarted');
    this.physics.add.existing(plushaTrigger, true);
    this.triggers.push(plushaTrigger);

    // Примечание: бои с обычными венграми теперь запускаются видимыми спрайтами
    // в createWorldEnemies() + updateWorldEnemies() (они сами нападают при приближении).

    // Финальный босс (активируется только после 1+ побеждённых врагов)
    const bossTrigger = this.add.zone(1420, 280, 90, 80);
    bossTrigger.setData('id', 'ludmila_intro');
    bossTrigger.setData('type', 'combat');
    bossTrigger.setData('combatType', 'boss');
    bossTrigger.setData('requires', 'enemiesDefeated');
    this.physics.add.existing(bossTrigger, true);
    this.triggers.push(bossTrigger);

    // Визуальные маркеры триггеров (можно убрать в релизе)
    if (false) { // поставь true для отладки
      this.triggers.forEach(t => {
        this.add.rectangle(t.x, t.y, t.width, t.height, 0xff00ff, 0.2);
      });
    }
  }

  private setupControls(): void {
    // Клавиатура
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    // Виртуальный джойстик — всегда создаём (на телефоне он критичен).
    // Позиция в левом нижнем углу в координатах игры.
    // Делаем его крупнее и заметнее специально для мобильного Safari.
    const joystickX = 78;
    const joystickY = this.scale.height - 82;
    this.joystick = new VirtualJoystick(this, joystickX, joystickY);

    // Кнопка "Взаимодействовать" — крупная, заметная, специально для тача
    const interactBtn = this.add.text(this.scale.width - 58, this.scale.height - 38, 'ВЗАИМ.', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#f0e6d2',
      backgroundColor: '#3f2f4a',
      padding: { x: 14, y: 9 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(2000);

    interactBtn.on('pointerdown', () => this.tryManualInteract());
  }

  private createMobileHint(): void {
    const hint = this.add.text(
      this.scale.width / 2,
      this.scale.height - 18,
      'Джойстик слева • Касайся NPC для разговора',
      {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#8b7aa3',
        align: 'center'
      }
    ).setOrigin(0.5).setScrollFactor(0).setAlpha(0.7);

    // Скрываем подсказку через 6 секунд
    this.time.delayedCall(6000, () => {
      this.tweens.add({
        targets: hint,
        alpha: 0,
        duration: 600,
        onComplete: () => hint.destroy()
      });
    });
  }

  update(time: number, delta: number): void {
    if (!this.player || !this.player.body) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;

    // === Клавиатура ===
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;

    // === Джойстик (приоритет над клавиатурой на тач-устройствах) ===
    if (this.joystick) {
      const f = this.joystick.getForce();
      if (f.distance > 0.15) {
        vx = f.x;
        vy = f.y;
      }
    }

    // Нормализация по диагонали
    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len;
      vy /= len;
    }

    const currentSpeed = this.speed;

    body.setVelocity(vx * currentSpeed, vy * currentSpeed);

    // === Простое отображение движения (без спрайтшита) ===
    // Просто флипаем по горизонтали. Для ощущения ходьбы можно позже добавить scale pulse или лёгкий tilt.
    if (Math.abs(vx) > 0.1) {
      this.player.setFlipX(vx < 0);
    }

    // При желании можно добавить очень лёгкий "дыхательный" scale при движении:
    // const s = 1 + Math.sin(time / 120) * 0.015;
    // this.player.setScale(s, s); но для начала оставляем чисто.

    // === Глубина по Y (псевдо 3D сортировка) ===
    this.player.setDepth(this.player.y + 100);

    // === Проверка триггеров (для диалогов и старых триггеров) ===
    this.checkTriggers();

    // === Обновляем последователей (Дима и Плюша идут за Дашей после квеста) ===
    this.updateFollowers(time, delta);

    // === Видимые враги: аггро и нападение ===
    this.updateWorldEnemies(time, delta);
  }

  private checkTriggers(): void {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    if (!playerBody) return;

    for (const trigger of this.triggers) {
      const id = trigger.getData('id') as string;
      if (this.triggered.has(id)) continue;

      if (this.physics.overlap(this.player, trigger)) {
        const type = trigger.getData('type');
        const requires = trigger.getData('requires');

        // Проверка требований
        if (requires === 'questStarted' && !this.questState.questStarted) continue;
        if (requires === 'enemiesDefeated' && this.questState.enemiesDefeated < 1) continue;

        if (type === 'dialogue') {
          this.triggered.add(id);
          this.startDialogue(id);
        } else if (type === 'combat') {
          this.triggered.add(id);
          const combatType = trigger.getData('combatType') || 'common';
          this.startCombat(combatType);
        }
        break; // только один триггер за раз
      }
    }
  }

  private tryManualInteract(): void {
    // Ищем ближайший триггер и активируем его принудительно
    let closest: Phaser.GameObjects.Zone | null = null;
    let minDist = 120;

    for (const t of this.triggers) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y);
      if (d < minDist) {
        minDist = d;
        closest = t;
      }
    }

    if (closest) {
      const id = closest.getData('id');
      if (!this.triggered.has(id)) {
        const type = closest.getData('type');
        this.triggered.add(id);

        if (type === 'dialogue') this.startDialogue(id);
        else this.startCombat(closest.getData('combatType') || 'common');
      }
    }
  }

  private startDialogue(dialogueId: string): void {
    this.saveState();
    this.joystick?.setVisible(false);
    this.scene.pause();
    this.scene.launch('DialogueScene', {
      dialogueId,
      onComplete: (result: any) => {
        this.scene.resume();
        this.joystick?.setVisible(true);
        this.handleDialogueResult(dialogueId, result);
      }
    });
  }

  private handleDialogueResult(dialogueId: string, result: any): void {
    const state = this.questState;

    if (dialogueId === 'dima_quest_given') {
      state.questStarted = true;
      state.dimaJoined = true;

      // Присоединяем Диму к формации сразу за Дашей — только после получения квеста
      if (this.dimaSprite) {
        this.dimaSprite.x = this.player.x - 52;
        this.dimaSprite.y = this.player.y + 8;
        this.dimaSprite.setFlipX(false);
      }
    }

    if (dialogueId === 'plyusha_joined') {
      state.plyushaJoined = true;

      if (this.plushaSprite) {
        // Для маленькой Плюши (собаки) ставим ближе к формации — только после присоединения
        this.plushaSprite.x = this.player.x - 70;
        this.plushaSprite.y = this.player.y - 2;
        this.plushaSprite.setFlipX(false);
      }
    }

    // Если диалог вернул флаг старта боя
    if (result?.startCombat) {
      this.time.delayedCall(180, () => {
        this.startCombat(result.startCombat);
      });
    }

    this.saveState();
  }

  private startCombat(type: 'common' | 'boss'): void {
    this.saveState();
    this.joystick?.setVisible(false);

    const enemyCount = type === 'boss' ? 1 : 2;
    const isBoss = type === 'boss';

    this.scene.pause();
    this.scene.launch('CombatScene', {
      enemyType: type,
      enemyCount,
      isBoss,
      partyHP: this.questState.partyHP,
      items: this.questState.items,
      onVictory: (data: { partyHP: any; items: any }) => {
        this.scene.resume();
        this.joystick?.setVisible(true);
        this.handleCombatVictory(type, data);
      },
      onDefeat: () => {
        this.scene.resume();
        this.joystick?.setVisible(true);
        this.handleCombatDefeat();
      }
    });
  }

  private handleCombatVictory(type: string, data: { partyHP: any; items: any }): void {
    const state = this.questState;

    // Обновляем здоровье и предметы
    state.partyHP = data.partyHP;
    state.items = data.items;

    if (type === 'common') {
      state.enemiesDefeated = (state.enemiesDefeated || 0) + 1;
    } else if (type === 'boss') {
      state.bossDefeated = true;
      state.gameFinished = true;

      // Эпилог
      this.time.delayedCall(600, () => {
        this.scene.pause();
        this.scene.launch('DialogueScene', {
          dialogueId: 'victory_epilogue',
          onComplete: () => {
            this.scene.stop();
            this.scene.start('EndScene', { victory: true });
          }
        });
      });
      return;
    }

    this.saveState();

    // Небольшая награда
    if (Math.random() < 0.6 && state.items.healingPotion < 3) {
      state.items.healingPotion++;
    }
  }

  private handleCombatDefeat(): void {
    // Game Over — перезапускаем мир или показываем экран поражения
    this.saveState();
    this.scene.pause();

    const goText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 30,
      'Вы пали в бою...',
      { fontFamily: 'monospace', fontSize: '20px', color: '#ff6b6b' }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

    const retry = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 + 30,
      'ПОПРОБОВАТЬ СНОВА',
      {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#e8d5b7',
        backgroundColor: '#3a2f2a',
        padding: { x: 16, y: 8 }
      }
    )
      .setOrigin(0.5)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(3001);

    retry.on('pointerdown', () => {
      // Восстанавливаем здоровье и перезапускаем сцену
      const fresh = this.registry.get('questState');
      fresh.partyHP = { dasha: 42, dima: 38, plusha: 28 };
      this.registry.set('questState', fresh);
      localStorage.setItem('dasha_quest_state', JSON.stringify(fresh));

      goText.destroy();
      retry.destroy();
      this.scene.restart();
    });
  }

  private saveState(): void {
    this.registry.set('questState', this.questState);
    localStorage.setItem('dasha_quest_state', JSON.stringify(this.questState));
  }

  // === Новые методы для последователей и видимых врагов ===

  private createWorldEnemies(): void {
    // Размещаем видимых "венгров" вдоль тропы. Они будут нападать, когда игрок подойдёт близко.
    const positions = [
      { x: 920, y: 265 },
      { x: 1070, y: 278 },
      { x: 1250, y: 260 }   // третий ближе к боссу
    ];

    positions.forEach((pos, index) => {
      const sprite = this.add.sprite(pos.x, pos.y, 'enemy_avatar');
      sprite.setOrigin(0.5, 0.78);
      const enemyScale = 72 / sprite.height;  // увеличено в 2 раза
      sprite.setScale(enemyScale);
      sprite.setDepth(8);

      // Небольшой "idle" эффект (пока просто храним)
      this.worldEnemies.push({
        sprite,
        triggered: false,
        aggroRange: 130  // чуть больше из-за увеличенных спрайтов
      });
    });
  }

  private updateFollowers(time: number, delta: number): void {
    if (!this.questState.dimaJoined && !this.questState.plyushaJoined) return;

    const dt = delta / 1000;
    const baseSpeed = 110;  // чуть медленнее, чтобы не "убегали" вперёд

    if (this.dimaSprite && this.questState.dimaJoined) {
      // Дима следует "сзади" (левее) игрока.
      // Чтобы не подходил "сам" назад, двигается только если игрок ушёл вперёд.
      const desiredX = this.player.x - 65;
      const desiredY = this.player.y + 8;

      // Только если игрок реально продвинулся вперёд относительно Димы
      if (this.player.x > this.dimaSprite.x + 30) {
        this.moveFollowerTowards(this.dimaSprite, { x: desiredX, y: desiredY }, baseSpeed, dt);
      }
    }

    if (this.plushaSprite && this.questState.plyushaJoined) {
      // Плюша (собака) — меньше, поэтому держим её ближе в формации
      const desiredX = this.player.x - 70;
      const desiredY = this.player.y - 2;

      if (this.player.x > this.plushaSprite.x + 25) {
        this.moveFollowerTowards(this.plushaSprite, { x: desiredX, y: desiredY }, baseSpeed * 0.9, dt);
      }
    }
  }

  private moveFollowerTowards(
    follower: Phaser.GameObjects.Sprite,
    target: { x: number; y: number },
    speed: number,
    dt: number
  ): void {
    const dx = target.x - follower.x;
    const dy = target.y - follower.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 6) {
      const vx = (dx / dist) * speed;
      const vy = (dy / dist) * speed;

      follower.x += vx * dt;
      follower.y += vy * dt;

      if (Math.abs(dx) > 2) {
        follower.setFlipX(dx < 0);
      }

      // Лёгкий боб
      const bob = Math.sin(Date.now() / 170) * 0.7;
      follower.y += bob * dt * 12;
    }
  }

  private updateWorldEnemies(time: number, delta: number): void {
    if (!this.questState.questStarted) return;  // квесты: враги нападают только после разговора с Димой

    for (const we of this.worldEnemies) {
      if (we.triggered) continue;

      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        we.sprite.x, we.sprite.y
      );

      const range = we.aggroRange ?? 105;

      if (dist < range) {
        we.triggered = true;

        // Реакция: венгр "замечает" и чуть подаётся вперёд
        const dx = this.player.x - we.sprite.x;
        we.sprite.x += Math.sign(dx) * 22;

        // Визуальный восклицательный знак (чтобы было понятно, что происходит)
        const alert = this.add.text(we.sprite.x, we.sprite.y - 32, '!!!', {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#ff5555',
          fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
          targets: alert,
          y: alert.y - 18,
          alpha: 0,
          duration: 480,
          ease: 'Sine.easeOut',
          onComplete: () => alert.destroy()
        });

        // Небольшая задержка перед боем, чтобы игрок увидел реакцию
        this.time.delayedCall(320, () => {
          if (this.scene.isActive('WorldScene')) {
            this.startCombat('common');
          }
        });
      } else {
        // Лёгкий idle-боб, когда стоит на месте
        const bob = Math.sin(time / 220 + we.sprite.x) * 0.35;
        we.sprite.y = we.sprite.y + bob * 0.08;
      }
    }
  }
}
