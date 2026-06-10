/**
 * EndScene.ts
 * Экран победы / эпилог.
 * Юмористическая концовка как просил пользователь.
 */

import Phaser from 'phaser';

export class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndScene' });
  }

  init(data: { victory?: boolean }): void {
    // Можно расширить для разных концовок
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    // Красивый тёмный фон
    this.add.rectangle(w / 2, h / 2, w, h, 0x0f0a14);

    // Декоративная рамка
    const frame = this.add.graphics();
    frame.lineStyle(4, 0x8b7aa3, 0.7);
    frame.strokeRect(30, 80, w - 60, h - 160);

    const title = this.add.text(w / 2, 120, 'КОНЕЦ', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#e8d5b7'
    }).setOrigin(0.5);

    const story = [
      'Людмила Конюхова повержена.',
      '',
      'Венгры разбежались кто куда.',
      'Деревня снова может спать спокойно.',
      '',
      'Плюша получила целую колбасу.',
      'Дима наконец-то может выпить кофе.',
      'А Даша...',
      '',
      'Даша просто хочет домой.'
    ];

    let y = 170;
    story.forEach((line, i) => {
      this.add.text(w / 2, y, line, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#c7b8a3',
        align: 'center'
      }).setOrigin(0.5);
      y += 22;
    });

    const thanks = this.add.text(w / 2, h - 110, 'Спасибо за игру!', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#a3c17a'
    }).setOrigin(0.5);

    const restart = this.add.text(w / 2, h - 58, 'НАЧАТЬ СНАЧАЛА', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#e8d5b7',
      backgroundColor: '#2a2233',
      padding: { x: 18, y: 8 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    restart.on('pointerdown', () => {
      // Полный сброс сохранения
      localStorage.removeItem('dasha_quest_state');
      this.scene.stop('WorldScene');
      this.scene.stop('DialogueScene');
      this.scene.stop('CombatScene');
      this.scene.start('BootScene');
    });
  }
}
