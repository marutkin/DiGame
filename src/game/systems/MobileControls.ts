import Phaser from 'phaser';
import { JRPG } from '../ui/JrpgPalette';
import { getSafeInsets } from '../ui/SafeInsets';

/**
 * Virtual on-screen controls for mobile/touch.
 * JRPG-styled D-pad + action button.
 */
export class MobileControls {
  private scene: Phaser.Scene;

  private root!: Phaser.GameObjects.Container;
  private actionBtn!: Phaser.GameObjects.Graphics;
  private actionText!: Phaser.GameObjects.Text;
  private actionHit!: Phaser.GameObjects.Zone;
  private dpadButtons = new Map<string, { gfx: Phaser.GameObjects.Graphics; draw: (active: boolean) => void }>();

  private cursors: { [key: string]: boolean } = {
    left: false, right: false, up: false, down: false,
  };

  private onAction?: () => void;
  private readonly dpadSize = 48;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(onActionCallback?: () => void) {
    this.onAction = onActionCallback;

    const { width, height } = this.scene.scale;
    this.root = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(500).setAlpha(0.88);

    const bg = this.scene.add.graphics();
    bg.fillStyle(JRPG.windowFill, 0.75);
    bg.fillCircle(0, 0, 58);
    bg.lineStyle(2, JRPG.windowBorderInner, 0.8);
    bg.strokeCircle(0, 0, 58);
    this.root.add(bg);

    const dirs = [
      { key: 'up', x: 0, y: -this.dpadSize / 2, label: '↑' },
      { key: 'down', x: 0, y: this.dpadSize / 2, label: '↓' },
      { key: 'left', x: -this.dpadSize / 2, y: 0, label: '←' },
      { key: 'right', x: this.dpadSize / 2, y: 0, label: '→' },
    ];

    dirs.forEach(dir => {
      const btn = this.scene.add.graphics();
      const drawBtn = (active: boolean) => {
        btn.clear();
        btn.fillStyle(active ? JRPG.windowBorderInner : 0x333355, active ? 0.95 : 0.85);
        btn.fillCircle(dir.x, dir.y, 22);
        btn.lineStyle(1, JRPG.windowBorderOuter, 0.7);
        btn.strokeCircle(dir.x, dir.y, 22);
      };
      drawBtn(false);
      this.dpadButtons.set(dir.key, { gfx: btn, draw: drawBtn });

      const txt = this.scene.add.text(dir.x, dir.y, dir.label, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
      }).setOrigin(0.5);

      this.root.add([btn, txt]);

      const hit = this.scene.add.zone(dir.x, dir.y, 48, 48).setOrigin(0.5);
      hit.setInteractive();
      this.root.add(hit);

      hit.on('pointerdown', () => {
        this.cursors[dir.key] = true;
        drawBtn(true);
      });

      const release = () => {
        this.cursors[dir.key] = false;
        drawBtn(false);
      };

      hit.on('pointerup', release);
      hit.on('pointerout', release);
      hit.on('pointerupoutside', release);
    });

    const actSize = 54;
    this.actionBtn = this.scene.add.graphics();
    this.actionText = this.scene.add.text(0, 0, 'A', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ccffcc',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.actionHit = this.scene.add.zone(0, 0, actSize * 2, actSize * 2).setOrigin(0.5);
    this.actionHit.setInteractive();
    this.root.add([this.actionBtn, this.actionText, this.actionHit]);

    this.actionHit.on('pointerdown', () => {
      this.drawAction(true);
      if (this.onAction) this.onAction();
    });
    this.actionHit.on('pointerup', () => this.drawAction(false));
    this.actionHit.on('pointerout', () => this.drawAction(false));
    this.actionHit.on('pointerupoutside', () => this.drawAction(false));

    this.reposition(width, height);
    this.scene.scale.on('resize', this.handleResize, this);
  }

  private handleResize = (size: Phaser.Structs.Size) => {
    this.reposition(size.width, size.height);
  };

  private reposition(width: number, height: number) {
    const { left, bottom, right } = getSafeInsets();
    const dpadX = 72 + left;
    const dpadY = height - 88 - bottom;
    this.root.setPosition(dpadX, dpadY);

    const actX = width - 68 - right;
    const actY = height - 80 - bottom;
    this.actionBtn.setPosition(actX - dpadX, actY - dpadY);
    this.actionText.setPosition(actX - dpadX, actY - dpadY);
    this.actionHit.setPosition(actX - dpadX, actY - dpadY);
    this.drawAction(false);
  }

  private drawAction(pressed: boolean) {
    const actSize = 54;
    const x = this.actionBtn.x;
    const y = this.actionBtn.y;
    this.actionBtn.clear();
    this.actionBtn.fillStyle(pressed ? 0x448844 : JRPG.windowFill, pressed ? 0.95 : 0.85);
    this.actionBtn.fillCircle(x, y, actSize);
    this.actionBtn.lineStyle(3, pressed ? 0xaaffaa : JRPG.windowBorderInner);
    this.actionBtn.strokeCircle(x, y, actSize);
  }

  getRoot(): Phaser.GameObjects.Container {
    return this.root;
  }

  isDown(dir: 'left' | 'right' | 'up' | 'down'): boolean {
    return this.cursors[dir] || false;
  }

  destroy() {
    this.scene.scale.off('resize', this.handleResize, this);
    if (this.root) this.root.destroy(true);
  }
}
