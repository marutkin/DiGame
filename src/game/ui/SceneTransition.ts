import Phaser from 'phaser';
import type { UiCamera } from './UiCamera';

/** Fade overlay for scene/map transitions. */
export class SceneTransition {
  private static registerOverlay(scene: Phaser.Scene, rect: Phaser.GameObjects.Rectangle) {
    const uiCamera = scene.registry.get('uiCamera') as UiCamera | undefined;
    uiCamera?.showOnUi(rect);
  }

  static fadeOut(scene: Phaser.Scene, duration = 350, color = 0x000010): Promise<void> {
    return new Promise((resolve) => {
      const { width, height } = scene.scale;
      const rect = scene.add
        .rectangle(width / 2, height / 2, width, height, color, 0)
        .setScrollFactor(0)
        .setDepth(10000);
      SceneTransition.registerOverlay(scene, rect);

      scene.tweens.add({
        targets: rect,
        alpha: 1,
        duration,
        onComplete: () => {
          rect.destroy();
          resolve();
        },
      });
    });
  }

  static fadeIn(scene: Phaser.Scene, duration = 400, color = 0x000010) {
    const { width, height } = scene.scale;
    const rect = scene.add
      .rectangle(width / 2, height / 2, width, height, color, 1)
      .setScrollFactor(0)
      .setDepth(10000);
    SceneTransition.registerOverlay(scene, rect);

    scene.tweens.add({
      targets: rect,
      alpha: 0,
      duration,
      onComplete: () => rect.destroy(),
    });
  }
}