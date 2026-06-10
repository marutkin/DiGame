import Phaser from 'phaser';
import { JRPG, UI_FONT } from '../ui/JrpgPalette';
import { SaveManager } from '../systems/SaveManager';

/**
 * Credits roll after the player completes the story at the chapel.
 */
export class EndingScene extends Phaser.Scene {
  private saveManager = new SaveManager();

  constructor() {
    super('EndingScene');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#080818');

    this.add.text(width / 2, 40, 'DiGame', {
      fontFamily: UI_FONT,
      fontSize: '32px',
      color: JRPG.textSpeaker,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const credits = [
      '',
      'История завершена',
      '',
      'Даша',
      'Плюша (той-пудель)',
      'Дима',
      '',
      'Злые Венгры',
      'Людмила Конюхова',
      '',
      'Создано с Phaser 3 + TypeScript',
      'Для смартфонов и браузера',
      '',
      'Спасибо за игру!',
      '',
    ];

    const block = this.add.text(width / 2, height + 20, credits.join('\n'), {
      fontFamily: UI_FONT,
      fontSize: '14px',
      color: JRPG.textMain,
      align: 'center',
      lineSpacing: 10,
    }).setOrigin(0.5, 0);

    this.tweens.add({
      targets: block,
      y: -block.height - 20,
      duration: 14000,
      ease: 'Linear',
      onComplete: () => this.showReturnPrompt(),
    });

    this.time.delayedCall(2000, this.showReturnPrompt);
  }

  private returnShown = false;

  private showReturnPrompt = () => {
    if (this.returnShown) return;
    this.returnShown = true;

    const { width, height } = this.scale;
    const prompt = this.add.text(width / 2, height - 36, 'Нажми SPACE — в главное меню', {
      fontFamily: UI_FONT,
      fontSize: '12px',
      color: JRPG.textDim,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: prompt, alpha: 1, duration: 600 });

    const goTitle = () => {
      this.saveManager.clearSave();
      this.scene.start('TitleScene');
    };

    this.input.once('pointerdown', goTitle);
    this.input.keyboard?.once('keydown-SPACE', goTitle);
    this.input.keyboard?.once('keydown-ENTER', goTitle);
  };
}