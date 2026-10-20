import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

if (!existsSync(dist)) {
  console.error('dist/ is missing — run `npm run build` first.');
  process.exit(1);
}

const outDir = resolve(root, 'release');
mkdirSync(outDir, { recursive: true });

const archive = resolve(outDir, `ajar-${pkg.version}.zip`);
rmSync(archive, { force: true });

execFileSync('zip', ['-r', '-q', '-X', archive, '.'], {
  cwd: dist,
  stdio: 'inherit',
});

console.log(`\nPacked ${archive}`);
