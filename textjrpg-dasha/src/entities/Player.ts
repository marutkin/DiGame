/**
 * Player.ts
 * Базовый класс игрока для мира.
 * Пока основная логика живёт в WorldScene, но класс оставлен для расширения.
 */
import Phaser from 'phaser';

export class Player extends Phaser.GameObjects.Sprite {
  public speed = 140;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(20, 22);
  }

  // В будущем здесь можно вынести update movement, анимации и т.д.
}
