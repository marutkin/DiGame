import { cpSync, mkdirSync, existsSync } from 'fs';

mkdirSync('docs/assets/maps', { recursive: true });
mkdirSync('docs/assets/data', { recursive: true });
mkdirSync('docs/assets/images', { recursive: true });
mkdirSync('docs/assets/audio', { recursive: true });

cpSync('assets/maps', 'docs/assets/maps', { recursive: true });
cpSync('assets/data', 'docs/assets/data', { recursive: true });

if (existsSync('assets/images/tilesets')) {
  cpSync('assets/images/tilesets', 'docs/assets/images/tilesets', { recursive: true });
}
if (existsSync('assets/images/sprites')) {
  cpSync('assets/images/sprites', 'docs/assets/images/sprites', { recursive: true });
}
if (existsSync('assets/audio')) {
  cpSync('assets/audio', 'docs/assets/audio', { recursive: true });
}

// Copy user-provided custom assets (user_assets/<character>/field_avatar.jpg, portrait.jpg, full_body.jpg etc.)
// These are referenced directly by path in AssetLoader so they must exist in the built output.
if (existsSync('user_assets')) {
  mkdirSync('docs/user_assets', { recursive: true });
  cpSync('user_assets', 'docs/user_assets', { recursive: true });
}

console.log('Game data + media copied to docs/assets/ (user_assets also copied for custom character images)');