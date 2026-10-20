import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const pkg = JSON.parse(readFileSync(path('./package.json'), 'utf8')) as {
  version: string;
};

export default defineConfig({
  root: path('./src'),
  publicDir: path('./public'),
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
