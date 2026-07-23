import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const args = process.argv.slice(2);
const modeArg = args.find((arg) => arg.startsWith('--mode='));
const fileArg = args.find((arg) => arg.startsWith('--file='));
const mode = modeArg?.slice('--mode='.length) || 'draft';
const file = resolve(fileArg?.slice('--file='.length) || 'store/release-manifest.json');
const errors = [];

if (!['draft', 'production'].includes(mode)) {
  console.error('Usage: node scripts/verify-store-release-manifest.mjs --mode=draft|production [--file=path]');
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(file, 'utf8'));
} catch (error) {
  console.error(JSON.stringify({mode, ready:false, errors:[`Could not read store release manifest: ${error instanceof Error ? error.message : 'invalid JSON'}`]}, null, 2));
  process.exit(1);
}

const requiredObject = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label} must be an object.`);
    return {};
  }
  return value;
};
const requiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) errors.push(`${label} is required.`);
  return typeof value === 'string' ? value.trim() : '';
};
const requiredBoolean = (value, label) => {
  if (typeof value !== 'boolean') errors.push(`${label} must be true or false.`);
  return value === true;
};
const requiredArray = (value, label) => {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array.`);
    return [];
  }
  return value;
};
const lengthLimit = (value, max, label) => {
  if (typeof value === 'string' && value.length > max) errors.push(`${label} must be ${max} characters or fewer.`);
};
const isHttps = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !['example.com', 'localhost'].includes(parsed.hostname) && !parsed.hostname.endsWith('.example.com');
  } catch {
    return false;
  }
};

if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
const product = requiredObject(manifest.product, 'product');
const identifiers = requiredObject(manifest.identifiers, 'identifiers');
const copy = requiredObject(manifest.copy, 'copy');
const appStore = requiredObject(copy.appStore, 'copy.appStore');
const playStore = requiredObject(copy.playStore, 'copy.playStore');
const publicUrls = requiredObject(manifest.publicUrls, 'publicUrls');
const support = requiredObject(manifest.support, 'support');
const review = requiredObject(manifest.review, 'review');
const compliance = requiredObject(manifest.compliance, 'compliance');
const commerce = requiredObject(manifest.commerce, 'commerce');
const providers = requiredObject(manifest.providers, 'providers');
const assets = requiredObject(manifest.assets, 'assets');
const evidence = requiredObject(manifest.evidence, 'evidence');

requiredString(product.name, 'product.name');
requiredString(product.audience, 'product.audience');
if (product.minimumAge !== 18) errors.push('product.minimumAge must remain 18 for an adults-only dating product.');
const markets = requiredArray(product.markets, 'product.markets');
for (const market of ['US', 'CA']) if (!markets.includes(market)) errors.push(`product.markets must include ${market}.`);

if (identifiers.iosBundleId !== 'com.destinyone.app') errors.push('identifiers.iosBundleId must match the production iOS bundle ID.');
if (identifiers.androidPackage !== 'com.destinyone.app') errors.push('identifiers.androidPackage must match the production Android package.');
if (identifiers.urlScheme !== 'destinyone') errors.push('identifiers.urlScheme must match the production deep-link scheme.');

for (const [label, value] of [
  ['copy.appStore.name', appStore.name],
  ['copy.appStore.subtitle', appStore.subtitle],
  ['copy.appStore.promotionalText', appStore.promotionalText],
  ['copy.appStore.keywords', appStore.keywords],
  ['copy.appStore.fullDescriptionFile', appStore.fullDescriptionFile],
  ['copy.playStore.name', playStore.name],
  ['copy.playStore.shortDescription', playStore.shortDescription],
  ['copy.playStore.fullDescriptionFile', playStore.fullDescriptionFile],
]) requiredString(value, label);
lengthLimit(appStore.name, 30, 'App Store name');
lengthLimit(appStore.subtitle, 30, 'App Store subtitle');
lengthLimit(appStore.promotionalText, 170, 'App Store promotional text');
lengthLimit(appStore.keywords, 100, 'App Store keywords');
lengthLimit(playStore.name, 30, 'Play Store name');
lengthLimit(playStore.shortDescription, 80, 'Play Store short description');

let fullDescription = '';
try {
  fullDescription = readFileSync(resolve(playStore.fullDescriptionFile), 'utf8');
} catch {
  errors.push('Play Store full description file is missing.');
}
if (appStore.fullDescriptionFile !== playStore.fullDescriptionFile) errors.push('App Store and Play Store must use the same reviewed full-description source unless the release contract is intentionally versioned.');
const listingCopy = [appStore.promotionalText, appStore.keywords, playStore.shortDescription, fullDescription].join(' ');
if (!/USA|United States/i.test(listingCopy) || !/Canada/i.test(listingCopy)) errors.push('Store copy must clearly cover both the USA and Canada.');
if (!/South Asian|Indian/i.test(listingCopy)) errors.push('Store copy must identify the South Asian/Indian audience.');
for (const pattern of [/guaranteed match/i, /safest dating/i, /finds? your soulmate/i, /100% verified/i]) {
  if (pattern.test(listingCopy)) errors.push(`Store copy contains prohibited claim: ${pattern}.`);
}
if (!providers.verificationLive && /verified[- ]member|verified profile|identity verified/i.test(listingCopy)) errors.push('Store copy cannot claim verified members until the verification provider is live.');
if (!providers.venueInventoryLive && /book (a|your) date|reserve (a|your) (table|venue|date)/i.test(listingCopy)) errors.push('Store copy cannot claim live booking until venue inventory is connected.');

requiredBoolean(review.credentialsEmbedded, 'review.credentialsEmbedded');
if (review.credentialsEmbedded) errors.push('Reviewer credentials must never be embedded in the manifest or app bundle.');
const rawManifest = JSON.stringify(manifest);
if (/\b(?:otp|password|passcode)\b\s*[:=]\s*["']?\w{4,}/i.test(rawManifest) || /\b123456\b/.test(rawManifest)) errors.push('The manifest appears to contain reviewer credentials or an OTP.');

for (const key of ['legalReviewApproved', 'privacyLabelsApproved', 'dataSafetyApproved', 'ageRatingCompleted', 'ugcModerationDeclarationCompleted', 'accountDeletionTested', 'encryptionDeclarationCompleted']) {
  requiredBoolean(compliance[key], `compliance.${key}`);
}
for (const key of ['storeBillingLive']) requiredBoolean(commerce[key], `commerce.${key}`);
for (const key of ['verificationLive', 'venueInventoryLive', 'giftFulfillmentLive', 'pushNotificationsLive', 'crashReportingLive']) requiredBoolean(providers[key], `providers.${key}`);
requiredBoolean(assets.reviewedOnPhysicalDevices, 'assets.reviewedOnPhysicalDevices');
requiredArray(commerce.appleProductIds, 'commerce.appleProductIds');
requiredArray(commerce.googleProductIds, 'commerce.googleProductIds');
requiredArray(assets.appStoreScreenshotReferences, 'assets.appStoreScreenshotReferences');
requiredArray(assets.playStoreScreenshotReferences, 'assets.playStoreScreenshotReferences');

if (mode === 'production') {
  if (manifest.status !== 'approved') errors.push('Production manifest status must be approved.');
  for (const key of ['privacy', 'terms', 'support', 'accountDeletion']) {
    if (!isHttps(publicUrls[key])) errors.push(`publicUrls.${key} must be a published non-placeholder HTTPS URL.`);
  }
  if (typeof support.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(support.email)) errors.push('support.email must be a valid monitored address.');
  if (support.approved !== true) errors.push('support.approved must be true.');
  for (const [value, label] of [
    [support.escalationOwnerReference, 'support.escalationOwnerReference'],
    [review.accessReference, 'review.accessReference'],
    [review.instructionsReference, 'review.instructionsReference'],
    [assets.modelConsentEvidenceReference, 'assets.modelConsentEvidenceReference'],
    [evidence.releaseTicket, 'evidence.releaseTicket'],
    [evidence.physicalDeviceQaReference, 'evidence.physicalDeviceQaReference'],
    [evidence.backendGateReference, 'evidence.backendGateReference'],
    [evidence.providerGateReference, 'evidence.providerGateReference'],
  ]) requiredString(value, label);
  for (const key of ['legalReviewApproved', 'privacyLabelsApproved', 'dataSafetyApproved', 'ageRatingCompleted', 'ugcModerationDeclarationCompleted', 'accountDeletionTested', 'encryptionDeclarationCompleted']) {
    if (compliance[key] !== true) errors.push(`compliance.${key} must be approved before production submission.`);
  }
  if (assets.reviewedOnPhysicalDevices !== true) errors.push('Store screenshots must be reviewed on physical iOS and Android devices.');
  if (assets.appStoreScreenshotReferences.length < 3) errors.push('At least three approved App Store screenshot references are required.');
  if (assets.playStoreScreenshotReferences.length < 3) errors.push('At least three approved Play Store screenshot references are required.');
  if (commerce.storeBillingLive) {
    if (!commerce.appleProductIds.length || !commerce.googleProductIds.length) errors.push('Live store billing requires Apple and Google product IDs.');
    requiredString(commerce.restorePurchaseEvidenceReference, 'commerce.restorePurchaseEvidenceReference');
    requiredString(commerce.refundEvidenceReference, 'commerce.refundEvidenceReference');
  }
}

const summary = {
  mode,
  status: manifest.status ?? null,
  ready: errors.length === 0,
  marketCoverage: markets.filter((value) => ['US', 'CA'].includes(value)),
  publicLegalUrlsReady: ['privacy', 'terms', 'support', 'accountDeletion'].every((key) => isHttps(publicUrls[key])),
  approvalsReady: Object.values(compliance).every((value) => value === true),
  screenshotReferences: {
    ios: Array.isArray(assets.appStoreScreenshotReferences) ? assets.appStoreScreenshotReferences.length : 0,
    android: Array.isArray(assets.playStoreScreenshotReferences) ? assets.playStoreScreenshotReferences.length : 0
  },
  errors,
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exit(1);
