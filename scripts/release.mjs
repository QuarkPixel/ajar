#!/usr/bin/env node
/**
 * Cuts a release: bumps the version, packs the extension, commits, tags,
 * pushes, and publishes a GitHub release with the zip attached.
 *
 *   npm run release              # patch
 *   npm run release -- minor
 *   npm run release -- 1.4.2     # explicit
 *
 * Refuses to run on a dirty tree, so the release commit only ever contains
 * the version bump.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const run = (command, args) =>
  execFileSync(command, args, { cwd: root, stdio: 'inherit' });

const capture = (command, args, options = {}) =>
  execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    ...options,
  }).trim();

const fail = message => {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
};

const readJson = file => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const writeJson = (file, value) =>
  writeFileSync(resolve(root, file), `${JSON.stringify(value, null, 2)}\n`);

// ---------------------------------------------------------------- preflight

try {
  capture('gh', ['auth', 'status']);
} catch {
  fail('gh is missing or not signed in. Run `gh auth login` first.');
}

const dirty = capture('git', ['status', '--porcelain']);
if (dirty) {
  fail(`Working tree is not clean — commit or stash first:\n\n${dirty}`);
}

const pkg = readJson('package.json');
const current = pkg.version;
const requested = process.argv[2] ?? 'patch';

let next;
if (/^\d+\.\d+\.\d+$/.test(requested)) {
  next = requested;
} else {
  const [major, minor, patch] = current.split('.').map(Number);
  if (requested === 'major') next = `${major + 1}.0.0`;
  else if (requested === 'minor') next = `${major}.${minor + 1}.0`;
  else if (requested === 'patch') next = `${major}.${minor}.${patch + 1}`;
  else fail(`Unknown bump "${requested}". Use patch | minor | major | x.y.z`);
}

const tag = `v${next}`;
if (capture('git', ['tag', '--list', tag])) fail(`Tag ${tag} already exists.`);

// ------------------------------------------------------------------ version

pkg.version = next;
writeJson('package.json', pkg);

const lock = readJson('package-lock.json');
lock.version = next;
if (lock.packages?.['']) lock.packages[''].version = next;
writeJson('package-lock.json', lock);

console.log(`\n  ${current} → ${next}\n`);

// -------------------------------------------------------------- build + zip

run('npm', ['run', 'zip']);

const archive = resolve(root, 'release', `ajar-${next}.zip`);
if (!existsSync(archive)) fail(`Expected archive is missing: ${archive}`);

// -------------------------------------------------------------------- notes

// Releases are created on the remote, so the tag for the previous version may
// not exist locally yet — fetch it, otherwise every commit ends up in the log.
try {
  capture('git', ['fetch', '--tags', '--quiet'], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });
} catch {
  /* offline: fall back to whatever tags are already here */
}

const quiet = { stdio: ['ignore', 'pipe', 'ignore'] };

let previous = '';
try {
  previous = capture('git', ['describe', '--tags', '--abbrev=0'], quiet);
} catch {
  /* first release */
}

let changes = '';
try {
  changes = capture(
    'git',
    ['log', '--pretty=format:- %s', previous ? `${previous}..HEAD` : 'HEAD'],
    quiet
  );
} catch {
  changes = '';
}

const notes = `${changes || '- First release.'}

### Install

1. Download \`ajar-${next}.zip\` below.
2. Open \`chrome://extensions\` and switch on **Developer mode**.
3. Drag the zip onto the page.

Chrome labels it as an unpacked extension — that is what loading from disk
means, and it has no effect on how the extension works.
`;

mkdirSync(resolve(root, 'release'), { recursive: true });
const notesPath = resolve(root, 'release', `notes-${tag}.md`);
writeFileSync(notesPath, notes);

// --------------------------------------------------------- commit and publish

run('git', ['add', '-A']);
run('git', ['commit', '-m', `Release ${tag}`]);
run('git', ['tag', '-a', tag, '-m', `Ajar ${tag}`]);
run('git', ['push', 'origin', 'HEAD', '--tags']);

run('gh', [
  'release',
  'create',
  tag,
  '--title',
  next,
  '--notes-file',
  notesPath,
  archive,
]);
