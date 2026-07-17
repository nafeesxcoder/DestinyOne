import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {describe, expect, it} from 'vitest';
import {
  MOBILE_PILOT_JOURNEY,
  buildMobilePilotEvidenceSummary,
  validateMobilePilotEvidence,
} from '../../scripts/mobile-pilot-evidence-contract.mjs';

const workflow = readFileSync('.github/workflows/mobile-pilot-build.yml', 'utf8');

function packet(platform: 'ios' | 'android', overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    pilotCity: 'Toronto',
    platform,
    appVariant: 'pilot',
    backendMode: 'real',
    build: {id: `${platform}-build-123`, commitSha: '0123456789abcdef0123456789abcdef01234567', version: '1.0.0'},
    device: {physical: true, model: platform === 'ios' ? 'iPhone 15' : 'Pixel 8', osVersion: '18.0'},
    testerId: 'qa-001',
    executedAt: '2026-07-16T12:00:00.000Z',
    results: MOBILE_PILOT_JOURNEY.map(({id}) => ({
      id,
      status: 'passed',
      notes: `Verified ${id} with synthetic pilot accounts.`,
      evidence: [{type: 'screenshot', ref: `artifact://${platform}/${id}.png`, redacted: true}],
    })),
    ...overrides,
  };
}

describe('mobile pilot physical-device evidence', () => {
  it('requires every critical journey on a physical device with redacted evidence', () => {
    expect(validateMobilePilotEvidence(packet('ios')).valid).toBe(true);
    const invalid = packet('ios');
    invalid.results[0]!.evidence[0]!.redacted = false;
    expect(validateMobilePilotEvidence(invalid).errors).toContain('install_launch evidence must be marked redacted.');
  });

  it('rejects mock backend claims and personal or secret metadata', () => {
    expect(validateMobilePilotEvidence(packet('android', {backendMode: 'mock'})).valid).toBe(false);
    expect(validateMobilePilotEvidence(packet('android', {phoneNumber: '+10000000000'})).errors)
      .toContain('Evidence metadata contains a forbidden personal or secret field.');
  });

  it('requires verified iOS and Android reports from the same commit', () => {
    expect(buildMobilePilotEvidenceSummary([packet('ios')]).verified).toBe(false);
    expect(buildMobilePilotEvidenceSummary([packet('ios'), packet('android')]).verified).toBe(true);
    const otherCommit = packet('android', {
      build: {id: 'android-build-456', commitSha: 'abcdef0123456789abcdef0123456789abcdef01', version: '1.0.0'},
    });
    expect(buildMobilePilotEvidenceSummary([packet('ios'), otherCommit]).sameCommit).toBe(false);
  });

  it('writes only a sanitized verification summary from the CLI', () => {
    const dir = mkdtempSync(join(tmpdir(), 'destinyone-mobile-evidence-'));
    const iosPath = join(dir, 'ios.json');
    const androidPath = join(dir, 'android.json');
    const summaryPath = join(dir, 'summary.json');
    writeFileSync(iosPath, JSON.stringify(packet('ios')));
    writeFileSync(androidPath, JSON.stringify(packet('android')));
    const result = spawnSync(process.execPath, [
      'scripts/verify-mobile-pilot-evidence.mjs',
      iosPath,
      androidPath,
      `--summary-file=${summaryPath}`,
    ], {encoding: 'utf8'});
    const summary = readFileSync(summaryPath, 'utf8');
    expect(result.status).toBe(0);
    expect(summary).toContain('"verified": true');
    expect(summary).not.toContain('testerId');
    expect(summary).not.toContain('device');
    expect(summary).not.toContain('artifact://');
  });

  it('keeps signed builds manual, confirmation-gated and pilot-separated', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain("inputs.confirm == 'BUILD_TORONTO_PILOT'");
    expect(workflow).toContain('inputs.credentials_preconfigured');
    expect(workflow).toContain("inputs.change_ticket != ''");
    expect(workflow).toContain('environment: toronto-pilot-mobile');
    expect(workflow).toContain('secrets.PILOT_EXPO_TOKEN');
    expect(workflow).not.toContain('push:');
    expect(workflow).not.toContain('pull_request:');
  });

  it('runs local release gates before requesting the remote signed build', () => {
    const releaseCheck = workflow.indexOf('pnpm release:check');
    const environmentCheck = workflow.indexOf('pnpm mobile:build:verify');
    const build = workflow.indexOf('eas build --profile toronto-pilot');
    expect(releaseCheck).toBeGreaterThan(-1);
    expect(releaseCheck).toBeLessThan(environmentCheck);
    expect(environmentCheck).toBeLessThan(build);
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).toContain('eas-pilot-build-request.json');
  });
});
