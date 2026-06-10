import Phaser from 'phaser';
import { JRPG } from './JrpgPalette';

/** Draws a classic double-bordered JRPG window into a Graphics object. */
export function drawJrpgWindow(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  g.clear();

  // Drop shadow
  g.fillStyle(JRPG.windowBorderShadow, 0.55);
  g.fillRect(x + 3, y + 3, w, h);

  // Main fill with subtle gradient bands
  g.fillStyle(JRPG.windowFill, 1);
  g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle(JRPG.windowFillLight, 0.35);
  g.fillRect(x + 4, y + 4, w - 8, Math.floor(h * 0.4));

  // Outer border
  g.lineStyle(2, JRPG.windowBorderOuter, 1);
  g.strokeRect(x + 1, y + 1, w - 2, h - 2);

  // Inner border
  g.lineStyle(1, JRPG.windowBorderInner, 0.9);
  g.strokeRect(x + 4, y + 4, w - 8, h - 8);
}

/** Creates a container with a JRPG window background at the given size. */
export function createJrpgWindowContainer(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  depth = 400,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y).setDepth(depth);
  const gfx = scene.add.graphics();
  drawJrpgWindow(gfx, 0, 0, w, h);
  container.add(gfx);
  container.setSize(w, h);
  return container;
}