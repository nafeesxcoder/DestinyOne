export const MOBILE_PILOT_SCHEMA_VERSION = 1;

export const MOBILE_PILOT_JOURNEY = [
  {id: 'install_launch', title: 'Install, launch and resume'},
  {id: 'real_auth_otp', title: 'Real OTP sign-in, retry and expiry'},
  {id: 'profile_photo_camera', title: 'Profile, gallery and camera permissions'},
  {id: 'discovery_match', title: 'Discovery, decision and mutual match'},
  {id: 'chat_media_voice', title: 'Chat text, photo and voice note'},
  {id: 'date_plan', title: 'Date proposal, acceptance and safety plan'},
  {id: 'report_block', title: 'Report, block and access enforcement'},
  {id: 'permission_recovery', title: 'Permission denial and recovery'},
  {id: 'offline_restart', title: 'Offline, restart and state recovery'},
  {id: 'privacy_deletion', title: 'Privacy controls and deletion request'},
];

const supportedPlatforms = new Set(['ios', 'android']);
const supportedEvidenceTypes = new Set(['screenshot', 'video', 'log']);
const forbiddenKeys = /^(email|phone|phoneNumber|fullName|messageBody|otp|password|accessToken|refreshToken|serviceRoleKey)$/i;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasForbiddenKey(value) {
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  if (!isObject(value)) return false;
  return Object.entries(value).some(([key, child]) => forbiddenKeys.test(key) || hasForbiddenKey(child));
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateMobilePilotEvidence(packet) {
  const errors = [];
  const platform = packet?.platform;

  if (!isObject(packet)) return {valid: false, platform: null, errors: ['Evidence packet must be a JSON object.']};
  if (packet.schemaVersion !== MOBILE_PILOT_SCHEMA_VERSION) errors.push(`schemaVersion must be ${MOBILE_PILOT_SCHEMA_VERSION}.`);
  if (packet.pilotCity !== 'Toronto') errors.push('pilotCity must be Toronto.');
  if (!supportedPlatforms.has(platform)) errors.push('platform must be ios or android.');
  if (packet.appVariant !== 'pilot') errors.push('appVariant must be pilot.');
  if (packet.backendMode !== 'real') errors.push('backendMode must be real.');
  if (!packet.device?.physical) errors.push('A physical device is required.');
  if (!isNonEmptyString(packet.device?.model) || !isNonEmptyString(packet.device?.osVersion)) errors.push('Device model and OS version are required.');
  if (!isNonEmptyString(packet.build?.id) || !isNonEmptyString(packet.build?.commitSha) || !isNonEmptyString(packet.build?.version)) errors.push('Build id, commitSha and version are required.');
  if (!/^[0-9a-f]{7,40}$/i.test(packet.build?.commitSha ?? '')) errors.push('build.commitSha must be a Git commit SHA.');
  if (!isNonEmptyString(packet.testerId)) errors.push('A non-personal testerId is required.');
  if (!isNonEmptyString(packet.executedAt) || Number.isNaN(Date.parse(packet.executedAt))) errors.push('executedAt must be an ISO timestamp.');
  if (hasForbiddenKey(packet)) errors.push('Evidence metadata contains a forbidden personal or secret field.');

  const results = Array.isArray(packet.results) ? packet.results : [];
  const resultById = new Map(results.map((result) => [result?.id, result]));
  for (const journey of MOBILE_PILOT_JOURNEY) {
    const result = resultById.get(journey.id);
    if (!result) {
      errors.push(`Missing journey result: ${journey.id}.`);
      continue;
    }
    if (result.status !== 'passed') errors.push(`${journey.id} must have status passed.`);
    if (!isNonEmptyString(result.notes)) errors.push(`${journey.id} requires concise notes.`);
    if (!Array.isArray(result.evidence) || result.evidence.length === 0) {
      errors.push(`${journey.id} requires at least one evidence reference.`);
      continue;
    }
    for (const item of result.evidence) {
      if (!supportedEvidenceTypes.has(item?.type)) errors.push(`${journey.id} has an unsupported evidence type.`);
      if (!isNonEmptyString(item?.ref)) errors.push(`${journey.id} evidence ref is required.`);
      if (item?.redacted !== true) errors.push(`${journey.id} evidence must be marked redacted.`);
    }
  }

  if (results.some((result) => !MOBILE_PILOT_JOURNEY.some((journey) => journey.id === result?.id))) {
    errors.push('Evidence packet contains an unknown journey result.');
  }

  return {valid: errors.length === 0, platform: supportedPlatforms.has(platform) ? platform : null, errors};
}

export function buildMobilePilotEvidenceSummary(packets) {
  const validations = packets.map((packet) => ({packet, validation: validateMobilePilotEvidence(packet)}));
  const platforms = Object.fromEntries(['ios', 'android'].map((platform) => {
    const match = validations.find(({validation}) => validation.platform === platform);
    return [platform, {
      verified: Boolean(match?.validation.valid),
      buildId: match?.validation.valid ? match.packet.build.id : null,
      commitSha: match?.validation.valid ? match.packet.build.commitSha : null,
      executedAt: match?.validation.valid ? match.packet.executedAt : null,
      errors: match?.validation.errors ?? [`Missing ${platform} evidence packet.`],
    }];
  }));
  const sameCommit = platforms.ios.commitSha && platforms.ios.commitSha === platforms.android.commitSha;

  return {
    schemaVersion: MOBILE_PILOT_SCHEMA_VERSION,
    pilotCity: 'Toronto',
    verified: platforms.ios.verified && platforms.android.verified && Boolean(sameCommit),
    sameCommit: Boolean(sameCommit),
    journeyCount: MOBILE_PILOT_JOURNEY.length,
    platforms,
  };
}
