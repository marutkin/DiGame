import Phaser from 'phaser';
import { AssetLoader } from '../assets/AssetLoader';
import { JRPG, UI_FONT } from '../ui/JrpgPalette';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.load.json('dialogues', 'assets/data/dialogues.json');
    this.load.json('enemies', 'assets/data/enemies.json');
    this.load.json('items', 'assets/data/items.json');
    this.load.json('maps', 'assets/data/maps.json');
    this.load.json('tilesets', 'assets/data/tilesets.json');
    this.load.json('sprites', 'assets/data/sprites.json');
    this.load.json('audio', 'assets/data/audio.json');

    AssetLoader.preloadAssets(this);

    const { width, height } = this.scale;
    const barW = 220;
    const bar = this.add.graphics();
    const text = this.add.text(width / 2, height / 2 - 10, 'Загрузка...', {
      fontFamily: UI_FONT,
      fontSize: '14px',
      color: JRPG.textMain,
    }).setOrigin(0.5);

    this.load.on('progress', (v: number) => {
      bar.clear();
      bar.fillStyle(0x222244, 1);
      bar.fillRect(width / 2 - barW / 2, height / 2 + 16, barW, 14);
      bar.fillStyle(JRPG.windowBorderInner, 1);
      bar.fillRect(width / 2 - barW / 2, height / 2 + 16, barW * v, 14);
    });

    this.load.on('complete', () => {
      bar.destroy();
      text.destroy();
    });
  }

  create() {
    const sprites = this.cache.json.get('sprites') || {};
    AssetLoader.createAnimations(this, sprites);

    this.registry.set('dialogues', this.cache.json.get('dialogues') || {});
    this.registry.set('enemies', this.cache.json.get('enemies') || {});
    this.registry.set('items', this.cache.json.get('items') || {});
    this.registry.set('maps', this.cache.json.get('maps') || {});
    this.registry.set('tilesets', this.cache.json.get('tilesets') || {});
    this.registry.set('sprites', sprites);
    this.registry.set('audio', this.cache.json.get('audio') || {});

    this.scene.start('TitleScene');
  }
}