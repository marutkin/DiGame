/**
 * BootScene.ts
 * 
 * Отвечает за:
 * - Preload всех ассетов (спрайты, портреты, full_body)
 * - Создание анимаций (переиспользуются в WorldScene и CombatScene)
 * - Инициализация простых глобальных данных (QuestSystem, сохранение)
 * - Переход в WorldScene
 * 
 * Все ассеты берутся из user_assets (скопированы в assets/sprites/*)
 */

import Phaser from 'phaser';
import dialogues from '../../data/dialogues.json';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // === Мировые спрайты (оверворлд) ===
    this.load.image('dasha_avatar', 'assets/sprites/dasha/avatar.png');
    this.load.image('dima_avatar', 'assets/sprites/dima/avatar.png');
    this.load.image('plusha_avatar', 'assets/sprites/plusha/avatar.png');
    this.load.image('enemy_avatar', 'assets/sprites/enemy_common/avatar.png');
    this.load.image('ludmila_avatar', 'assets/sprites/enemy_ludmila/avatar.png');

    // === Портреты для диалогов ===
    this.load.image('portrait_dasha', 'assets/sprites/dasha/portrait.png');
    this.load.image('portrait_dima', 'assets/sprites/dima/portrait.png');
    this.load.image('portrait_plusha', 'assets/sprites/plusha/portrait.png');
    this.load.image('portrait_enemy', 'assets/sprites/enemy_common/portrait.png');
    this.load.image('portrait_ludmila', 'assets/sprites/enemy_ludmila/portrait.png');

    // === Спрайтшиты для боёвки (full_body) ===
    this.load.image('full_dasha', 'assets/sprites/dasha/full_body.png');
    this.load.image('full_dima', 'assets/sprites/dima/full_body.png');
    this.load.image('full_plusha', 'assets/sprites/plusha/full_body.png');
    this.load.image('full_enemy', 'assets/sprites/enemy_common/full_body.png');
    this.load.image('full_ludmila', 'assets/sprites/enemy_ludmila/full_body.png');

    // Звуки (опционально — плейсхолдеры через Web Audio позже)
    // this.load.audio('hit', 'assets/audio/hit.mp3');
  }

  create(): void {
    // === Создаём глобальные анимации для оверворлда ===
    // Предполагаем, что avatar.png — это спрайтшит.
    // На практике нужно подогнать frameWidth / frameHeight под реальный размер.
    // Сейчас используем разумные значения (32x32 или 24x32 — типично для таких ассетов).

    const avatarFrameWidth = 32;
    const avatarFrameHeight = 32;

    // Если твой спрайтшит другой — поменяй здесь цифры.
    // Можно сделать 4 строки (вниз, влево, вправо, вверх) по 3-4 кадра.

    // Для простоты и надёжности сначала сделаем "ленивые" анимации:
    // Если спрайтшит не нарезан — просто будем использовать одну текстуру и flipX.

    // Создаём текстуры для тайлов (простые цветные квадраты + обводка)
    this.createTileTextures();

    // Сохраняем диалоги в registry, чтобы другие сцены могли читать
    this.registry.set('dialogues', dialogues);

    // Инициализируем состояние квеста (если нет сохранения)
    this.initQuestState();

    // Сообщаем главному потоку, что игра готова (скроет #loading)
    window.dispatchEvent(new Event('phaser-game-ready'));

    // Переходим в мир
    this.scene.start('WorldScene');
  }

  /**
   * Создаём простые процедурные текстуры тайлов.
   * Это позволяет обойтись без внешнего tileset.png на старте.
   */
  private createTileTextures(): void {
    const g = this.add.graphics();

    // === Улучшенная трава (с текстурой и вариациями) ===
    g.fillStyle(0x2d5a3d, 1);
    g.fillRect(0, 0, 32, 32);

    // Базовая текстура травы — мелкие штрихи и точки для объёма
    g.fillStyle(0x265033, 0.7);
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * 32;
      const y = Math.random() * 32;
      g.fillRect(x, y, 1 + Math.random() * 2, 2 + Math.random() * 3);
    }

    // Светлые блики на траве
    g.fillStyle(0x3a6b4a, 0.35);
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * 32;
      const y = Math.random() * 32;
      g.fillCircle(x, y, 1 + Math.random());
    }

    g.lineStyle(1, 0x1f3f2a, 0.5);
    g.strokeRect(0, 0, 32, 32);
    g.generateTexture('tile_grass', 32, 32);
    g.clear();

    // === Тропинка с текстурой (камушки + вариация) ===
    g.fillStyle(0x8b6f47, 1);
    g.fillRect(0, 0, 32, 32);

    // Камушки и грязь на тропе
    g.fillStyle(0x6b5538, 0.6);
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * 32;
      const y = Math.random() * 32;
      g.fillCircle(x, y, 1 + Math.random() * 2);
    }

    g.fillStyle(0xa38b6a, 0.25);
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 32;
      const y = Math.random() * 32;
      g.fillRect(x, y, 2, 1);
    }

    g.lineStyle(1, 0x5c4730, 0.6);
    g.strokeRect(1, 1, 30, 30);
    g.generateTexture('tile_path', 32, 32);
    g.clear();

    // === Трава с цветами — больше и разнообразнее ===
    g.fillStyle(0x2d5a3d, 1);
    g.fillRect(0, 0, 32, 32);

    // Базовая текстура
    g.fillStyle(0x265033, 0.6);
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * 32;
      const y = Math.random() * 32;
      g.fillRect(x, y, 1, 2 + Math.random() * 2);
    }

    // Цветы — разные цвета и размеры
    const flowerColors = [0xe8a0c0, 0xf4d35e, 0xa8d5a2, 0xffb3b3];
    for (let i = 0; i < 5; i++) {
      const x = 4 + Math.random() * 24;
      const y = 4 + Math.random() * 24;
      g.fillStyle(flowerColors[i % flowerColors.length], 0.85);
      g.fillCircle(x, y, 2 + Math.random());
      g.fillCircle(x + 3, y - 1, 1.5);
    }

    g.generateTexture('tile_grass_flowers', 32, 32);
    g.clear();

    // === Дерево (улучшенное, многослойное) ===
    // Крона — несколько слоёв эллипсов
    g.fillStyle(0x1f3f2a, 0.95);
    g.fillEllipse(32, 28, 52, 46);

    g.fillStyle(0x265033, 0.85);
    g.fillEllipse(32, 24, 42, 38);

    g.fillStyle(0x2d5a3d, 0.7);
    g.fillEllipse(32, 22, 30, 28);

    // Ствол
    g.fillStyle(0x3a2f2a, 1);
    g.fillRect(26, 42, 12, 22);

    // Лёгкая текстура ствола
    g.lineStyle(1, 0x2a221f, 0.6);
    g.lineBetween(28, 44, 28, 60);
    g.lineBetween(32, 46, 32, 61);
    g.lineBetween(35, 45, 35, 59);

    g.generateTexture('tree', 64, 70);
    g.clear();

    // === Куст (маленький) ===
    g.fillStyle(0x265033, 0.9);
    g.fillEllipse(20, 18, 32, 26);

    g.fillStyle(0x2d5a3d, 0.75);
    g.fillEllipse(20, 16, 22, 18);

    g.generateTexture('bush', 40, 32);
    g.destroy();
  }

  private initQuestState(): void {
    const saved = localStorage.getItem('dasha_quest_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);

        // При любом рестарте игры (обновление страницы / новая сессия) сбрасываем HP и предметы до максимума.
        // Прогресс квеста (присоединённые персонажи, побеждённые враги и т.д.) сохраняется.
        state.partyHP = { dasha: 42, dima: 38, plusha: 28 };
        state.items = { healingPotion: 2, energyDrink: 1 };

        this.registry.set('questState', state);
        // Пересохраняем, чтобы localStorage тоже отражал восстановленное состояние
        localStorage.setItem('dasha_quest_state', JSON.stringify(state));
      } catch {
        this.createFreshQuestState();
      }
    } else {
      this.createFreshQuestState();
    }
  }

  private createFreshQuestState(): void {
    const fresh = {
      questStarted: false,
      dimaJoined: false,
      plyushaJoined: false,
      enemiesDefeated: 0,
      bossDefeated: false,
      gameFinished: false,
      partyHP: {
        dasha: 42,
        dima: 38,
        plusha: 28
      },
      items: {
        healingPotion: 2,
        energyDrink: 1
      }
    };
    this.registry.set('questState', fresh);
    localStorage.setItem('dasha_quest_state', JSON.stringify(fresh));
  }
}
