/**
 * NPC.ts
 * Простой NPC для мира. Пока используется напрямую в WorldScene.
 */
import Phaser from 'phaser';

export class NPC extends Phaser.GameObjects.Sprite {
  public id: string;
  public displayName: string;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, id: string, name: string) {
    super(scene, x, y, texture);
    this.id = id;
    this.displayName = name;

    scene.add.existing(this);
    this.setDepth(9);
  }
}
