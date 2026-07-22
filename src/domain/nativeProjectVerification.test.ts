import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {describe, expect, it} from 'vitest';

const verifier = 'scripts/verify-native-project.mjs';
const workflow = readFileSync('.github/workflows/mobile-pilot-build.yml', 'utf8');
const appJson = readFileSync('app.json', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

function createPilotFixture(options: {unsafeLocation?: boolean; unsafeAndroid?: boolean; devScheme?: boolean} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'destinyone-native-project-'));
  const android = join(root, 'android/app/src/main');
  const ios = join(root, 'ios/DestinyOnePilot');
  mkdirSync(android, {recursive: true});
  mkdirSync(ios, {recursive: true});
  mkdirSync(join(root, 'ios/DestinyOnePilot.xcodeproj'), {recursive: true});
  const manifest = `<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" tools:node="remove"/>
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove"/>
    ${options.unsafeAndroid ? '<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>' : ''}
    <application android:allowBackup="${options.unsafeAndroid ? 'true' : 'false'}">
      <activity><intent-filter><data android:scheme="destinyone-pilot"/>${options.devScheme ? '<data android:scheme="exp+destinyone"/>' : ''}</intent-filter></activity>
    </application>
  </manifest>`;
  writeFileSync(join(android, 'AndroidManifest.xml'), manifest);
  writeFileSync(join(root, 'android/app/build.gradle'), "namespace 'com.destinyone.app.pilot'\napplicationId 'com.destinyone.app.pilot'\n");
  writeFileSync(join(ios, 'Info.plist'), `<plist><dict>
    <string>destinyone-pilot</string>
    <key>NSCameraUsageDescription</key><string>Camera</string>
    <key>NSLocationWhenInUseUsageDescription</key><string>Location</string>
    ${options.unsafeLocation ? '<key>NSLocationAlwaysUsageDescription</key><string>Always</string>' : ''}
    <key>NSMicrophoneUsageDescription</key><string>Microphone</string>
    <key>NSPhotoLibraryUsageDescription</key><string>Photos</string>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
  </dict></plist>`);
  writeFileSync(join(ios, 'DestinyOnePilot.entitlements'), '<plist><dict><string>merchant.com.destinyone.app.pilot</string></dict></plist>');
  writeFileSync(join(root, 'ios/DestinyOnePilot.xcodeproj/project.pbxproj'), 'PRODUCT_BUNDLE_IDENTIFIER = "com.destinyone.app.pilot";');
  return root;
}

function verify(root: string) {
  return spawnSync(process.execPath, [verifier, '--variant=pilot', `--project-dir=${root}`], {encoding: 'utf8'});
}

describe('generated native project verification', () => {
  it('accepts a least-privilege pilot project with isolated native identities', () => {
    const result = verify(createPilotFixture());
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"leastPrivilegeVerified": true');
  });

  it('rejects background location, backup, and foreground-service expansion', () => {
    const result = verify(createPilotFixture({unsafeLocation: true, unsafeAndroid: true}));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Android backup must be disabled');
    expect(result.stdout).toContain('Background foreground-service permissions are not allowed');
    expect(result.stdout).toContain('NSLocationAlwaysUsageDescription must not be declared');
  });

  it('rejects the generated Expo development scheme in a pilot release', () => {
    const result = verify(createPilotFixture({devScheme: true}));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('must not expose the generated Expo development scheme');
  });

  it('keeps least-privilege source config and required system UI dependency', () => {
    expect(appJson).toContain('"locationAlwaysAndWhenInUsePermission": false');
    expect(appJson).toContain('"enableBackgroundPlayback": false');
    expect(appJson).toContain('"allowBackup": false');
    expect(appJson).toContain('"android.permission.SYSTEM_ALERT_WINDOW"');
    expect(packageJson.dependencies['expo-system-ui']).toMatch(/^~?55\./);
  });

  it('prebuilds and audits native projects before requesting the signed EAS build', () => {
    const prebuild = workflow.indexOf('expo prebuild --no-install --platform all');
    const verifyNative = workflow.indexOf('pnpm mobile:native:verify -- --variant=pilot');
    const easBuild = workflow.indexOf('eas build --profile toronto-pilot');
    expect(prebuild).toBeGreaterThan(-1);
    expect(prebuild).toBeLessThan(verifyNative);
    expect(verifyNative).toBeLessThan(easBuild);
  });
});
