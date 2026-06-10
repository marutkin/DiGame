import Phaser from 'phaser';
import { UI_FONT } from './JrpgPalette';

export interface TypewriterConfig {
  x: number;
  y: number;
  width: number;
  fontSize?: number;
  color?: string;
  speedMs?: number;
}

/**
 * Reveals text character-by-character like classic JRPG dialogue.
 * Tap / Space skips to full text.
 */
export class TypewriterText {
  private scene: Phaser.Scene;
  private textObj: Phaser.GameObjects.Text;
  private fullText = '';
  private revealed = 0;
  private timer: Phaser.Time.TimerEvent | null = null;
  private done = true;
  private onComplete?: () => void;

  constructor(scene: Phaser.Scene, config: TypewriterConfig) {
    this.scene = scene;
    this.textObj = scene.add.text(config.x, config.y, '', {
      fontFamily: UI_FONT,
      fontSize: `${config.fontSize ?? 13}px`,
      color: config.color ?? '#f0f0f8',
      wordWrap: { width: config.width },
      lineSpacing: 4,
    }).setScrollFactor(0).setDepth(410);
  }

  getObject(): Phaser.GameObjects.Text {
    return this.textObj;
  }

  isComplete(): boolean {
    return this.done;
  }

  start(text: string, onComplete?: () => void) {
    this.stop();
    this.fullText = text;
    this.revealed = 0;
    this.done = false;
    this.onComplete = onComplete;
    this.textObj.setText('');

    this.timer = this.scene.time.addEvent({
      delay: 28,
      repeat: text.length - 1,
      callback: () => {
        this.revealed++;
        this.textObj.setText(this.fullText.slice(0, this.revealed));
        if (this.revealed >= this.fullText.length) {
          this.finish();
        }
      },
    });
  }

  skip() {
    if (this.done) return;
    this.stop();
    this.textObj.setText(this.fullText);
    this.finish();
  }

  private finish() {
    this.done = true;
    this.onComplete?.();
  }

  private stop() {
    if (this.timer) {
      this.timer.destroy();
      this.timer = null;
    }
  }

  destroy() {
    this.stop();
    this.textObj.destroy();
  }
}