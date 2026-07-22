import {readFileSync, writeFileSync, mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {describe, expect, it} from 'vitest';

const script = 'scripts/verify-store-release-manifest.mjs';
const manifest = JSON.parse(readFileSync('store/release-manifest.json', 'utf8'));

function verify(value: unknown, mode: 'draft'|'production' = 'draft') {
  const directory = mkdtempSync(join(tmpdir(), 'destinyone-store-'));
  const path = join(directory, 'manifest.json');
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  return spawnSync(process.execPath, [script, `--mode=${mode}`, `--file=${path}`], {encoding:'utf8'});
}

describe('store release manifest', () => {
  it('keeps the canonical draft structurally valid and aligned to USA and Canada', () => {
    const result = verify(manifest);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"marketCoverage"');
    expect(manifest.product.markets).toEqual(['US', 'CA']);
    expect(manifest.product.minimumAge).toBe(18);
  });

  it('rejects provider claims before the provider is live', () => {
    const changed = structuredClone(manifest);
    changed.copy.playStore.shortDescription = 'Verified profiles for South Asians in the USA and Canada.';
    const result = verify(changed);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('cannot claim verified members');
  });

  it('rejects credentials and demo OTPs in release metadata', () => {
    const changed = structuredClone(manifest);
    changed.review.instructionsReference = 'Reviewer OTP: 123456';
    const result = verify(changed);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('reviewer credentials or an OTP');
  });

  it('keeps production submission blocked until real approvals and evidence exist', () => {
    const result = verify(manifest, 'production');
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Production manifest status must be approved');
    expect(result.stdout).toContain('publicUrls.privacy');
    expect(result.stdout).toContain('physicalDeviceQaReference');
  });
});
