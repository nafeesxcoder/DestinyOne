import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve('dist');
const client = resolve(dist, 'client');
const server = resolve(dist, 'server');

await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });
for (const entry of ['index.html', 'favicon.ico', 'metadata.json', '_expo', 'assets']) {
  await cp(resolve(dist, entry), resolve(client, entry), { recursive: true });
}
await cp(resolve('sites/worker/index.js'), resolve(server, 'index.js'));
