import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {buildMobilePilotEvidenceSummary} from './mobile-pilot-evidence-contract.mjs';

const args = process.argv.slice(2);
const outputArg = args.find((arg) => arg.startsWith('--summary-file='));
const packetPaths = args.filter((arg) => !arg.startsWith('--'));

if (packetPaths.length === 0) {
  console.error('Usage: pnpm mobile:pilot:evidence <ios.json> <android.json> [--summary-file=artifacts/mobile-pilot-summary.json]');
  process.exit(1);
}

const packets = [];
const readErrors = [];
for (const packetPath of packetPaths) {
  try {
    packets.push(JSON.parse(await readFile(resolve(packetPath), 'utf8')));
  } catch (error) {
    readErrors.push(`${packetPath}: ${error instanceof Error ? error.message : 'Could not read evidence packet.'}`);
  }
}

const summary = buildMobilePilotEvidenceSummary(packets);
if (readErrors.length) summary.readErrors = readErrors;

if (outputArg) {
  const outputPath = resolve(outputArg.slice('--summary-file='.length));
  await mkdir(dirname(outputPath), {recursive: true});
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, {mode: 0o600});
}

console.log(JSON.stringify(summary, null, 2));
if (!summary.verified || readErrors.length) process.exit(1);
