/**
 * Copies Kenney CC0 assets from assets/images/_src into game-ready paths.
 * Run after downloading: npm run setup:assets
 */
import { copyFileSync, mkdirSync, cpSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'assets/images/_src');

function ensure(dir) {
  mkdirSync(dir, { recursive: true });
}

function copy(from, to) {
  if (!existsSync(from)) {
    console.warn(`Missing: ${from}`);
    return false;
  }
  ensure(dirname(to));
  copyFileSync(from, to);
  return true;
}

// Tilesets (packed sheets)
copy(join(src, 'tiny-town/Tilemap/tilemap_packed.png'), join(root, 'assets/images/tilesets/town.png'));
copy(join(src, 'tiny-dungeon/Tilemap/tilemap_packed.png'), join(root, 'assets/images/tilesets/dungeon.png'));
copy(join(src, 'rpg-pack/Spritesheet/roguelikeSheet_transparent.png'), join(root, 'assets/images/tilesets/forest.png'));

// Sprites
copy(join(src, 'roguelike-characters/Spritesheet/roguelikeChar_transparent.png'), join(root, 'assets/images/sprites/characters.png'));
copy(join(src, 'rpg-pack/Spritesheet/roguelikeSheet_transparent.png'), join(root, 'assets/images/sprites/rpg_sheet.png'));

// Portal / props from town tiles
copy(join(src, 'tiny-town/Tiles/tile_0099.png'), join(root, 'assets/images/sprites/portal.png'));

// Audio (curated subset)
const audioOut = join(root, 'assets/audio');
ensure(audioOut);

const audioFiles = [
  ['impact-sounds/Audio/footstep_grass_000.ogg', 'footstep.ogg'],
  ['rpg-audio/Audio/bookFlip1.ogg', 'dialogue.ogg'],
  ['rpg-audio/Audio/chop.ogg', 'attack.ogg'],
  ['rpg-audio/Audio/knifeSlice.ogg', 'hit.ogg'],
  ['rpg-audio/Audio/bookClose.ogg', 'victory.ogg'],
  ['rpg-audio/Audio/doorOpen_1.ogg', 'warp.ogg'],
  ['impact-sounds/Audio/impactSoft_medium_000.ogg', 'impact.ogg'],
];

for (const [from, to] of audioFiles) {
  copy(join(src, from), join(audioOut, to));
}

// Build composite tile reference sheets with known tile order (see build-tilesets.ps1)
try {
  execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${join(root, 'scripts/build-tilesets.ps1')}"`, {
    stdio: 'inherit',
    cwd: root,
  });
} catch {
  console.warn('build-tilesets.ps1 skipped or failed — using full Kenney sheets.');
}

// Licenses
copy(join(src, 'tiny-town/License.txt'), join(root, 'assets/images/CREDITS-Kenney.txt'));

console.log('Assets setup complete.');