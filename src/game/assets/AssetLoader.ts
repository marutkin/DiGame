import Phaser from 'phaser';

/** Custom character folders under user_assets/ (field_avatar, portrait, full_body). */
const USER_CHARACTERS = [
  'dasha',
  'dima',
  'plusha',
  'enemy_common',
  'enemy_ludmila',
] as const;

interface SpriteSheetConfig {
  sheet: string;
  frameWidth?: number;
  frameHeight?: number;
  spacing?: number;
  frame?: number;
  walkFrames?: Record<string, number[]>;
}

/**
 * Loads Kenney CC0 assets from assets/images and assets/audio.
 */
export class AssetLoader {
  static preloadAssets(scene: Phaser.Scene) {
    scene.load.image('town', 'assets/images/tilesets/town_game.png');
    scene.load.image('forest', 'assets/images/tilesets/forest_game.png');
    scene.load.image('dungeon', 'assets/images/tilesets/dungeon_game.png');
    scene.load.image('portal', 'assets/images/sprites/portal.png');

    scene.load.spritesheet('characters', 'assets/images/sprites/characters.png', {
      frameWidth: 16,
      frameHeight: 16,
      spacing: 1,
    });
    scene.load.spritesheet('rpg_sheet', 'assets/images/sprites/rpg_sheet.png', {
      frameWidth: 16,
      frameHeight: 16,
      spacing: 1,
    });

    // User-provided custom assets (user_assets/<name>/field_avatar.jpg, portrait.jpg, full_body.jpg)
    for (const id of USER_CHARACTERS) {
      scene.load.image(id, `user_assets/${id}/field_avatar.jpg`);
      scene.load.image(`${id}_portrait`, `user_assets/${id}/portrait.jpg`);
      scene.load.image(`${id}_full`, `user_assets/${id}/full_body.jpg`);
    }

    const sfx = ['footstep', 'dialogue', 'attack', 'hit', 'victory', 'warp', 'impact'] as const;
    for (const key of sfx) {
      scene.load.audio(key, `assets/audio/${key}.ogg`);
    }
  }

  static createAnimations(scene: Phaser.Scene, sprites: Record<string, SpriteSheetConfig>) {
    const player = sprites.player;
    if (!player?.walkFrames) return;

    for (const [dir, frames] of Object.entries(player.walkFrames)) {
      if (!scene.anims.exists(`player-walk-${dir}`)) {
        scene.anims.create({
          key: `player-walk-${dir}`,
          frames: frames.map((f) => ({ key: 'characters', frame: f })),
          frameRate: 8,
          repeat: -1,
        });
      }
      if (!scene.anims.exists(`player-idle-${dir}`)) {
        scene.anims.create({
          key: `player-idle-${dir}`,
          frames: [{ key: 'characters', frame: frames[0] }],
        });
      }
    }
  }

  static getNpcFrame(sprites: Record<string, any>, spriteKey: string): { key: string; frame?: number } {
    const cfg = sprites[spriteKey];
    if (!cfg) return { key: 'characters', frame: 0 };
    if (cfg.texture) {
      return { key: cfg.texture };
    }
    return { key: cfg.sheet, frame: cfg.frame ?? 0 };
  }
}