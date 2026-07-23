import {readFileSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';

const args = process.argv.slice(2);
const variantArg = args.find((arg) => arg.startsWith('--variant='));
const projectDirArg = args.find((arg) => arg.startsWith('--project-dir='));
const variant = variantArg?.slice('--variant='.length);
const projectDir = resolve(projectDirArg?.slice('--project-dir='.length) || '.');
const variants = {
  development: {
    identifier: 'com.destinyone.app.dev',
    scheme: 'destinyone-dev',
    merchant: 'merchant.com.destinyone.app.dev',
  },
  pilot: {
    identifier: 'com.destinyone.app.pilot',
    scheme: 'destinyone-pilot',
    merchant: 'merchant.com.destinyone.app.pilot',
  },
  production: {
    identifier: 'com.destinyone.app',
    scheme: 'destinyone',
    merchant: 'merchant.com.destinyone.app',
  },
};
const expected = variants[variant];
const errors = [];

function read(path) {
  try {
    return readFileSync(join(projectDir, path), 'utf8');
  } catch {
    errors.push(`Missing generated native file: ${path}.`);
    return '';
  }
}

if (!expected) {
  console.error('Usage: pnpm mobile:native:verify -- --variant=development|pilot|production [--project-dir=path]');
  process.exit(1);
}

const androidManifest = read('android/app/src/main/AndroidManifest.xml');
const androidGradle = read('android/app/build.gradle');
const iosRoot = join(projectDir, 'ios');
let iosAppDirectory = '';
try {
  iosAppDirectory = readdirSync(iosRoot).find((entry) => !entry.startsWith('.') && !entry.endsWith('.xcodeproj') && !entry.endsWith('.xcworkspace') && !['Pods'].includes(entry)) || '';
} catch {
  errors.push('Missing generated ios directory.');
}
const iosInfo = iosAppDirectory ? read(`ios/${iosAppDirectory}/Info.plist`) : '';
const iosEntitlements = iosAppDirectory ? read(`ios/${iosAppDirectory}/${iosAppDirectory}.entitlements`) : '';
const iosProject = iosAppDirectory ? read(`ios/${iosAppDirectory}.xcodeproj/project.pbxproj`) : '';

const requireText = (content, value, message) => {
  if (!content.includes(value)) errors.push(message);
};
const forbidText = (content, value, message) => {
  if (content.includes(value)) errors.push(message);
};

requireText(androidGradle, `namespace '${expected.identifier}'`, 'Android namespace does not match the selected variant.');
requireText(androidGradle, `applicationId '${expected.identifier}'`, 'Android applicationId does not match the selected variant.');
requireText(androidManifest, 'android:allowBackup="false"', 'Android backup must be disabled for sensitive dating data.');
requireText(androidManifest, 'android.permission.ACCESS_COARSE_LOCATION', 'Android foreground approximate location permission is missing.');
requireText(androidManifest, 'android.permission.ACCESS_FINE_LOCATION" tools:node="remove"', 'Android fine location must be explicitly removed.');
requireText(androidManifest, 'android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove"', 'Android overlay permission must be explicitly removed from release builds.');
requireText(androidManifest, `android:scheme="${expected.scheme}"`, 'Android deep-link scheme does not match the selected variant.');
forbidText(androidManifest, 'android.permission.FOREGROUND_SERVICE', 'Background foreground-service permissions are not allowed for the current voice-note flow.');
forbidText(androidManifest, 'AudioControlsService', 'Background audio service is not allowed for the current voice-note flow.');
if (variant !== 'development') forbidText(androidManifest, 'android:scheme="exp+destinyone"', 'Pilot/production must not expose the generated Expo development scheme.');

requireText(iosProject, `PRODUCT_BUNDLE_IDENTIFIER = "${expected.identifier}";`, 'iOS bundle identifier does not match the selected variant.');
requireText(iosInfo, `<string>${expected.scheme}</string>`, 'iOS deep-link scheme does not match the selected variant.');
requireText(iosEntitlements, `<string>${expected.merchant}</string>`, 'Apple Pay merchant entitlement does not match the selected variant.');
for (const key of ['NSCameraUsageDescription', 'NSLocationWhenInUseUsageDescription', 'NSMicrophoneUsageDescription', 'NSPhotoLibraryUsageDescription']) {
  requireText(iosInfo, `<key>${key}</key>`, `iOS ${key} is missing.`);
}
for (const key of ['NSLocationAlwaysUsageDescription', 'NSLocationAlwaysAndWhenInUseUsageDescription']) {
  forbidText(iosInfo, `<key>${key}</key>`, `iOS ${key} must not be declared.`);
}
for (const orientation of ['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight']) {
  requireText(iosInfo, `<string>${orientation}</string>`, `iOS orientation ${orientation} is missing.`);
}
forbidText(iosInfo, '<string>audio</string>', 'iOS background audio mode is not allowed for the current voice-note flow.');
forbidText(iosInfo, '<string>location</string>', 'iOS background location mode is not allowed.');

const summary = {
  variant,
  identifier: expected.identifier,
  scheme: expected.scheme,
  iosProjectGenerated: Boolean(iosInfo && iosEntitlements && iosProject),
  androidProjectGenerated: Boolean(androidManifest && androidGradle),
  leastPrivilegeVerified: errors.length === 0,
  errors,
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exit(1);
