import Phaser from 'phaser';

/**
 * Dedicated UI camera (zoom 1, no scroll) so HUD/dialogue/controls stay on screen
 * while the world camera can zoom and follow the player.
 */
export class UiCamera {
  readonly camera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    this.camera = scene.cameras.add(0, 0, width, height);
    this.camera.setName('ui');
    this.camera.setScroll(0, 0);
    this.camera.setZoom(1);

    scene.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.camera.setSize(size.width, size.height);
    });
  }

  /** Render only on the UI camera; hide from the world camera. */
  showOnUi(...objects: Phaser.GameObjects.GameObject[]) {
    for (const obj of objects) {
      if (obj) this.camera.scene.cameras.main.ignore(obj);
    }
  }

  /** Render only on the world camera; hide from the UI camera. */
  hideFromUi(...objects: Phaser.GameObjects.GameObject[]) {
    for (const obj of objects) {
      if (obj) this.camera.ignore(obj);
    }
  }
}
