import Phaser from 'phaser';
import { JRPG, UI_FONT } from './JrpgPalette';
import { createJrpgWindowContainer } from './JrpgWindow';
import { getSafeInsets } from './SafeInsets';

/**
 * In-game HUD: map name, quest tracker, inventory strip.
 */
export class GameHud {
  private scene: Phaser.Scene;
  private root!: Phaser.GameObjects.Container;
  private mapText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private invText!: Phaser.GameObjects.Text;
  private getMapName!: () => string;
  private getQuest!: () => string;
  private getInventory!: () => string;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(getMapName: () => string, getQuest: () => string, getInventory: () => string) {
    this.destroy();
    this.getMapName = getMapName;
    this.getQuest = getQuest;
    this.getInventory = getInventory;

    this.root = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(200);
    this.layout();

    this.scene.scale.on('resize', this.handleResize, this);
    this.scene.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => this.refreshText(),
    });
  }

  private handleResize = () => {
    this.layout();
  };

  private layout() {
    const { width } = this.scene.scale;
    const { top, left, right } = getSafeInsets();
    const topY = 6 + top;

    this.root.removeAll(true);

    const topBar = createJrpgWindowContainer(this.scene, left + 6, topY, Math.min(200, width - 12 - left - right), 42, 200);
    this.root.add(topBar);

    this.mapText = this.scene.add.text(left + 14, topY + 6, this.getMapName(), {
      fontFamily: UI_FONT,
      fontSize: '12px',
      color: JRPG.textSpeaker,
      fontStyle: 'bold',
    });

    this.questText = this.scene.add.text(left + 14, topY + 22, this.getQuest(), {
      fontFamily: UI_FONT,
      fontSize: '10px',
      color: JRPG.textDim,
      wordWrap: { width: Math.min(188, width - 28 - left - right) },
    });

    const invW = Math.min(220, width - 12 - left - right);
    const invPanel = createJrpgWindowContainer(this.scene, width - invW - right - 6, topY, invW, 28, 200);
    this.root.add(invPanel);

    this.invText = this.scene.add.text(width - right - 14, topY + 8, '', {
      fontFamily: UI_FONT,
      fontSize: '10px',
      color: JRPG.textMain,
      align: 'right',
      wordWrap: { width: invW - 16 },
    }).setOrigin(1, 0);

    this.root.add([this.mapText, this.questText, this.invText]);
    this.refreshText();
  }

  private refreshText() {
    if (!this.mapText) return;
    this.mapText.setText(this.getMapName());
    this.questText.setText(this.getQuest());
    const inv = this.getInventory();
    this.invText.setText(inv ? `🎒 ${inv}` : '');
  }

  getRoot(): Phaser.GameObjects.Container {
    return this.root;
  }

  destroy() {
    this.scene.scale.off('resize', this.handleResize, this);
    this.root?.destroy(true);
  }
}
