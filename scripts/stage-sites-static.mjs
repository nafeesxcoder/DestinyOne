import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve('dist');
const client = resolve(dist, 'client');

await mkdir(client, { recursive: true });
for (const entry of ['index.html', 'favicon.ico', 'metadata.json', '_expo', 'assets']) {
  await cp(resolve(dist, entry), resolve(client, entry), { recursive: true });
}
