import './style.css';
import Phaser from 'phaser';
import { PreloadScene } from './game/scenes/PreloadScene';
import { TitleScene } from './game/scenes/TitleScene';
import { OverworldScene } from './game/scenes/OverworldScene';
import { BattleScene } from './game/scenes/BattleScene';
import { EndingScene } from './game/scenes/EndingScene';

// Main game configuration.
// Scale.RESIZE + pixelArt + touch/keyboard input are chosen for good smartphone experience.
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0a0a0a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 844,
    min: { width: 320, height: 480 },
    max: { width: 960, height: 960 },
  },
  scene: [PreloadScene, TitleScene, OverworldScene, BattleScene, EndingScene],
  input: {
    keyboard: true,
    mouse: true,
    touch: true,
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { x: 0, y: 0 },
    },
  },
};

const game = new Phaser.Game(config);

/** Keep canvas sized to the visible Safari viewport (address bar / home indicator). */
function fitToVisualViewport() {
  const container = document.getElementById('game-container');
  const vp = window.visualViewport;
  if (!container || !vp) return;

  container.style.width = `${vp.width}px`;
  container.style.height = `${vp.height}px`;
  game.scale.resize(Math.floor(vp.width), Math.floor(vp.height));
}

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', fitToVisualViewport);
  window.visualViewport.addEventListener('scroll', fitToVisualViewport);
}
window.addEventListener('orientationchange', () => {
  window.setTimeout(fitToVisualViewport, 150);
});
window.addEventListener('load', fitToVisualViewport);
fitToVisualViewport();
