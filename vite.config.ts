import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const pkg = JSON.parse(readFileSync(path('./package.json'), 'utf8')) as {
  version: string;
};

/**
 * package.json is the single source of truth for the version: the manifest is
 * rewritten on the way out so the two can never drift apart.
 */
function stampManifestVersion(): Plugin {
  return {
    name: 'ajar-stamp-manifest-version',
    closeBundle() {
      const file = path('./dist/manifest.json');
      const manifest = JSON.parse(readFileSync(file, 'utf8')) as {
        version: string;
      };
      if (manifest.version === pkg.version) return;
      manifest.version = pkg.version;
      writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
    },
  };
}

export default defineConfig({
  root: path('./src'),
  publicDir: path('./public'),
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [stampManifestVersion()],
  build: {
    outDir: path('./dist'),
    emptyOutDir: true,
    target: 'chrome110',
    modulePreload: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        intention: path('./src/intention/index.html'),
        options: path('./src/options/index.html'),
        background: path('./src/background.ts'),
      },
      output: {
        entryFileNames: chunk =>
          chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
