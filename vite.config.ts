import { defineConfig, type Plugin } from 'vite';
import { cpSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

function serveStaticFile(res: import('http').ServerResponse, filePath: string, contentType: string) {
  res.setHeader('Content-Type', contentType);
  res.end(readFileSync(filePath));
}

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ogg': 'audio/ogg',
  '.webp': 'image/webp',
};

function contentTypeFor(url: string): string | undefined {
  const lower = url.toLowerCase();
  for (const [ext, type] of Object.entries(CONTENT_TYPES)) {
    if (lower.endsWith(ext)) return type;
  }
  return undefined;
}

/** Serve and copy runtime game data + media assets. */
function gameAssetsPlugin(): Plugin {
  return {
    name: 'digame-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        const isGameAsset = url.startsWith('/assets/') || url.startsWith('/user_assets/');
        if (!isGameAsset) return next();

        const filePath = join(process.cwd(), url.slice(1));
        if (!existsSync(filePath)) return next();

        const contentType = contentTypeFor(url);
        if (!contentType) return next();

        serveStaticFile(res, filePath, contentType);
      });
    },
    closeBundle() {
      mkdirSync('docs/assets/maps', { recursive: true });
      mkdirSync('docs/assets/data', { recursive: true });
      cpSync('assets/maps', 'docs/assets/maps', { recursive: true });
      cpSync('assets/data', 'docs/assets/data', { recursive: true });
      if (existsSync('assets/images')) {
        cpSync('assets/images/tilesets', 'docs/assets/images/tilesets', { recursive: true });
        cpSync('assets/images/sprites', 'docs/assets/images/sprites', { recursive: true });
      }
      if (existsSync('assets/audio')) {
        cpSync('assets/audio', 'docs/assets/audio', { recursive: true });
      }
      if (existsSync('user_assets')) {
        mkdirSync('docs/user_assets', { recursive: true });
        cpSync('user_assets', 'docs/user_assets', { recursive: true });
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [gameAssetsPlugin()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
  },
});
