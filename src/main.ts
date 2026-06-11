import { Engine, DisplayMode, Color, Label, Font, FontUnit, Scene, ImageSource, Loader, Sprite } from 'excalibur';
import './style.css';

// Resources we want to preload (served from public/assets via setup:assets)
const resources = {
  dashaAvatar: new ImageSource('assets/dasha/avatar.png'),
  dashaFull: new ImageSource('assets/dasha/full_body.png'),
  dashaPortrait: new ImageSource('assets/dasha/portrait.png'),
};

const loader = new Loader(Object.values(resources));

// Simple bootstrap scene
class BootScene extends Scene {
  onInitialize() {
    const center = this.engine.screen.center;

    const label = new Label({
      text: 'DiGame — Excalibur\n✓ user_assets copied to public/assets',
      pos: center,
      font: new Font({
        size: 28,
        unit: FontUnit.Px,
        family: 'system-ui, sans-serif',
      }),
      color: Color.fromHex('#67e8f9'),
    });
    label.anchor.setTo(0.5, 0.5);
    this.add(label);

    // Prove an asset actually loaded from the generated public/assets path
    const sprite = new Sprite({
      image: resources.dashaAvatar,
    });
    sprite.pos = center.add(0, 120);
    sprite.scale = { x: 0.7, y: 0.7 };
    this.add(sprite);
  }
}

const game = new Engine({
  width: 1280,
  height: 720,
  displayMode: DisplayMode.FitScreen,
  backgroundColor: Color.fromHex('#0f172a'),
  canvasElementId: 'game',
  suppressPlayButton: true,
});

game.addScene('boot', new BootScene());
game.goToScene('boot');

// Start with the loader — this is the correct place to pass resources
game.start(loader).then(() => {
  console.log('%c[DiGame] Excalibur started successfully. Assets from public/assets/ are loaded.', 'color:#67e8f9');
}).catch((err) => {
  console.error('Failed to start game:', err);
});
