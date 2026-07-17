import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const client = join(dist, 'client');
const server = join(dist, 'server');

rmSync(dist, { recursive: true, force: true });

const expo = spawnSync(
  process.platform === 'win32' ? 'expo.cmd' : 'expo',
  ['export', '--platform', 'web', '--output-dir', client],
  { cwd: root, stdio: 'inherit' },
);

if (expo.status !== 0) {
  process.exit(expo.status ?? 1);
}

mkdirSync(server, { recursive: true });
mkdirSync(join(dist, '.openai'), { recursive: true });
cpSync(join(root, 'sites', 'worker', 'index.js'), join(server, 'index.js'));
cpSync(join(root, '.openai', 'hosting.json'), join(dist, '.openai', 'hosting.json'));

console.log('Sites artifact ready in dist/client and dist/server.');
