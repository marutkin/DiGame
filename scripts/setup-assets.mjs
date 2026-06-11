import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const sourceDir = join(projectRoot, 'user_assets');
const targetDir = join(projectRoot, 'public', 'assets');

console.log('Setting up assets...');
console.log(`  Source: ${sourceDir}`);
console.log(`  Target: ${targetDir}`);

try {
  if (!existsSync(sourceDir)) {
    console.warn('⚠ user_assets directory not found — skipping asset copy');
    process.exit(0);
  }

  // Clean previous generated assets
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }

  // Ensure public dir exists
  mkdirSync(dirname(targetDir), { recursive: true });

  // Copy entire user_assets tree into public/assets
  cpSync(sourceDir, targetDir, { recursive: true, force: true });

  console.log('✓ Assets ready: public/assets/ (copied from user_assets/)');
} catch (err) {
  console.error('✗ Asset setup failed:', err);
  process.exit(1);
}
