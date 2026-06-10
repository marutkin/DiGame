import Phaser from 'phaser';
import { SaveManager } from '../systems/SaveManager';
import { JRPG, UI_FONT } from '../ui/JrpgPalette';
import { createJrpgWindowContainer } from '../ui/JrpgWindow';
import { SceneTransition } from '../ui/SceneTransition';

export class TitleScene extends Phaser.Scene {
  private saveManager = new SaveManager();
  private selected = 0;
  private menuItems: Array<{ label: string; action: () => void }> = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Text;

  constructor() {
    super('TitleScene');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a1028');

    // Starfield
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const s = Phaser.Math.Between(1, 2);
      this.add.rectangle(x, y, s, s, 0xffffff, Phaser.Math.FloatBetween(0.2, 0.7));
    }

    // Ground silhouette
    const gnd = this.add.graphics();
    gnd.fillStyle(0x1a3828, 1);
    gnd.fillTriangle(0, height, width * 0.3, height - 80, width * 0.55, height);
    gnd.fillStyle(0x244830, 1);
    gnd.fillTriangle(width * 0.4, height, width * 0.75, height - 60, width, height);

    this.add.text(width / 2, height * 0.28, 'DiGame', {
      fontFamily: UI_FONT,
      fontSize: '52px',
      color: JRPG.textSpeaker,
      fontStyle: 'bold',
      stroke: '#000040',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(200);

    this.add.text(width / 2, height * 0.38, 'Даша и Плюша', {
      fontFamily: UI_FONT,
      fontSize: '14px',
      color: JRPG.textDim,
    }).setOrigin(0.5).setDepth(200);

    const hasSave = this.saveManager.hasSave();
    this.menuItems = [{ label: 'Новая игра', action: () => this.startNewGame() }];
    if (hasSave) {
      this.menuItems.push({ label: 'Продолжить', action: () => this.continueGame() });
    }

    const menuW = 200;
    const menuH = 28 + this.menuItems.length * 28;
    const menuX = width / 2 - menuW / 2;
    const menuY = height * 0.52;

    const menuWin = createJrpgWindowContainer(this, menuX, menuY, menuW, menuH, 450);
    this.add.existing(menuWin);

    this.cursor = this.add.text(menuX + 14, menuY + 16, '▶', {
      fontFamily: UI_FONT,
      fontSize: '14px',
      color: JRPG.cursor,
    }).setDepth(460);

    this.menuItems.forEach((item, i) => {
      const txt = this.add.text(menuX + 34, menuY + 14 + i * 28, item.label, {
        fontFamily: UI_FONT,
        fontSize: '15px',
        color: JRPG.textChoice,
      }).setInteractive({ useHandCursor: true }).setDepth(460);

      txt.on('pointerdown', item.action);
      txt.on('pointerover', () => { this.selected = i; this.refreshMenu(); });
      this.labels.push(txt);
    });

    this.refreshMenu();
    this.input.keyboard?.on('keydown-UP', () => {
      this.selected = (this.selected - 1 + this.menuItems.length) % this.menuItems.length;
      this.refreshMenu();
    });
    this.input.keyboard?.on('keydown-DOWN', () => {
      this.selected = (this.selected + 1) % this.menuItems.length;
      this.refreshMenu();
    });
    this.input.keyboard?.on('keydown-SPACE', () => this.menuItems[this.selected].action());
    this.input.keyboard?.on('keydown-ENTER', () => this.menuItems[this.selected].action());

    this.add.text(width / 2, height - 20, '↑↓ выбор  •  SPACE — подтвердить', {
      fontFamily: UI_FONT,
      fontSize: '10px',
      color: '#505868',
    }).setOrigin(0.5).setDepth(460);

    SceneTransition.fadeIn(this, 500);
  }

  private refreshMenu() {
    this.cursor.setY(this.labels[this.selected].y);
    this.labels.forEach((t, i) => {
      t.setColor(i === this.selected ? JRPG.textChoiceActive : JRPG.textChoice);
    });
  }

  private startNewGame() {
    const initial = SaveManager.createInitial('chapel', 120, 104);
    this.saveManager.save(initial);
    SceneTransition.fadeOut(this, 300).then(() => {
      this.scene.start('OverworldScene', { save: initial });
    });
  }

  private continueGame() {
    const loaded = this.saveManager.load();
    if (loaded) {
      SceneTransition.fadeOut(this, 300).then(() => {
        this.scene.start('OverworldScene', { save: loaded });
      });
    } else {
      this.startNewGame();
    }
  }
}