import { promises as fileSystem, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { configureGoogleDriveOAuth } from './src/shared/oauth-manifest.ts';

const packageVersion = (JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8'),
) as { version: string }).version;

function googleDriveOAuthManifest(clientId: string | undefined): Plugin {
  return {
    name: 'diaochang-google-drive-oauth-manifest',
    apply: 'build',
    async closeBundle() {
      const manifestPath = resolve(import.meta.dirname, 'dist/manifest.json');
      const manifest = JSON.parse(await fileSystem.readFile(manifestPath, 'utf8')) as Record<string, unknown>;
      const configured = configureGoogleDriveOAuth({ ...manifest, version: packageVersion }, clientId);
      await fileSystem.writeFile(
        manifestPath,
        `${JSON.stringify(configured.manifest, null, 2)}\n`,
        'utf8',
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, 'DIAOCHANG_');
  return {
    plugins: [react(), googleDriveOAuthManifest(env.DIAOCHANG_GOOGLE_OAUTH_CLIENT_ID)],
    define: { __APP_VERSION__: JSON.stringify(packageVersion) },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      minify: true,
      rollupOptions: {
        input: {
          sidepanel: resolve(import.meta.dirname, 'sidepanel.html'),
          offscreen: resolve(import.meta.dirname, 'offscreen.html'),
          'service-worker': resolve(import.meta.dirname, 'src/background/service-worker.ts'),
          'media-controller': resolve(import.meta.dirname, 'src/content/media-controller.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'service-worker' || chunkInfo.name === 'media-controller') {
              return `${chunkInfo.name}.js`;
            }

            return 'assets/[name]-[hash].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
