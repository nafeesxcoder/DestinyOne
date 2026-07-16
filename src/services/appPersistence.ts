import type { ChatMessage, CoupleChatSettings, ProfileDraft } from '../storage';
import {
  blockMember,
  createDateProposal,
  createLiveLocationShare,
  fetchMatchMessages,
  recordProfileView,
  recordDiscoverySignal,
  replaceCurrentUserProfilePhotos,
  reportMember,
  saveChatSettings,
  sendCurrentUserMessage,
  subscribeToChatMessages,
  submitIcebreakerAnswer,
  submitMatchDecision,
  uploadCurrentUserProfileMedia,
  uploadCurrentUserProfilePhotos,
  upsertCurrentUserProfile,
  upsertPrivacySettings,
  upsertUserPreferences,
} from './backend';

type PersistenceReason = 'backend' | 'preview_id' | 'demo' | 'error';

export type PersistenceResult<T = unknown> = {
  saved: boolean;
  reason: PersistenceReason;
  data?: T;
  error?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isBackendUuid(value: string) {
  return uuidPattern.test(value);
}

async function persistSafely<T>(operation: () => Promise<T | null>): Promise<PersistenceResult<T>> {
  try {
    const data = await operation();
    return data ? { saved: true, reason: 'backend', data } : { saved: false, reason: 'demo' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Backend save failed.';
    console.warn('[DestinyOne persistence]', message);
    return { saved: false, reason: 'error', error: message };
  }
}

export async function persistChatMessage(matchId: string, message: ChatMessage) {
  if (!isBackendUuid(matchId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => sendCurrentUserMessage(matchId, message));
}

export async function persistDateProposal(matchId: string, date: NonNullable<ChatMessage['date']>) {
  if (!isBackendUuid(matchId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => createDateProposal(matchId, date));
}

export async function fetchPersistedChatMessages(matchId: string) {
  if (!isBackendUuid(matchId)) return [] satisfies ChatMessage[];
  try {
    return await fetchMatchMessages(matchId) ?? [];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load chat messages.';
    console.warn('[DestinyOne chat fetch]', message);
    return [];
  }
}

export function subscribePersistedChatMessages(matchId: string, onMessage: (message: ChatMessage) => void) {
  if (!isBackendUuid(matchId)) return () => {};
  try {
    const channel = subscribeToChatMessages(matchId, onMessage);
    return () => { void channel?.unsubscribe(); };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not subscribe to chat messages.';
    console.warn('[DestinyOne chat realtime]', message);
    return () => {};
  }
}

export async function persistProfileView(viewedProfileId: string, durationSeconds = 5) {
  if (!isBackendUuid(viewedProfileId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => recordProfileView(viewedProfileId, durationSeconds, 'profile_detail'));
}

export async function persistDiscoverySignal(targetProfileId: string, signal: 'view' | 'interested' | 'skip') {
  if (!isBackendUuid(targetProfileId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => recordDiscoverySignal(targetProfileId, signal));
}

export async function persistMatchDecision(targetProfileId: string, decision: 'interested' | 'pass') {
  if (!isBackendUuid(targetProfileId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => submitMatchDecision(targetProfileId, decision));
}

export async function persistIcebreakerAnswer(matchId: string, question: string, answer: string) {
  if (!isBackendUuid(matchId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => submitIcebreakerAnswer(matchId, question, answer));
}

export async function persistReport(reportedId: string, reason: string, details?: string) {
  if (!isBackendUuid(reportedId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => reportMember(reportedId, reason, details));
}

export async function persistBlock(blockedId: string) {
  if (!isBackendUuid(blockedId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => blockMember(blockedId));
}

export async function persistPrivacySettings(settings: {
  lastSeenVisible?: boolean;
  onlineStatusVisible?: boolean;
  privateMode?: boolean;
  profileViewNotifications?: boolean;
}) {
  return persistSafely(() => upsertPrivacySettings({
    last_seen_visible: settings.lastSeenVisible,
    online_status_visible: settings.onlineStatusVisible,
    private_mode: settings.privateMode,
    profile_view_notifications: settings.profileViewNotifications,
  }));
}

export type OnboardingProfileSyncInput = {
  profile: ProfileDraft;
  verified: boolean;
  photos: string[];
  selfieUri: string;
  voiceIntroUri: string;
  vibes: string[];
  intent: string;
  alignment: Record<string, string>;
  smartDiscovery: boolean;
  crossedPaths: boolean;
  lastSeenVisible: boolean;
};

function normalizeText(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function birthDateFromAge(ageValue: string) {
  const parsed = Number.parseInt(ageValue, 10);
  const safeAge = Number.isFinite(parsed) && parsed >= 18 && parsed <= 90 ? parsed : 30;
  const birthYear = new Date().getFullYear() - safeAge;
  return `${birthYear}-01-01`;
}

function heightToCm(heightValue: string) {
  const normalized = heightValue.trim();
  if (!normalized) return null;
  const cm = Number.parseInt(normalized, 10);
  if (Number.isFinite(cm) && cm >= 120 && cm <= 230) return cm;
  const feetInches = normalized.match(/(\d)\D+(\d{1,2})/);
  if (!feetInches) return null;
  const feet = Number.parseInt(feetInches[1] ?? '', 10);
  const inches = Number.parseInt(feetInches[2] ?? '', 10);
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null;
  const total = Math.round(feet * 30.48 + inches * 2.54);
  return total >= 120 && total <= 230 ? total : null;
}

function intentToDatabase(intent: string): 'long_term' | 'marriage' | 'long_term_to_marriage' {
  const value = intent.toLowerCase();
  if (value.includes('leading') || (value.includes('long') && value.includes('marriage'))) return 'long_term_to_marriage';
  if (value.includes('marriage')) return 'marriage';
  return 'long_term';
}

export async function persistOnboardingProfile(input: OnboardingProfileSyncInput) {
  return persistSafely(async () => {
    const firstName = normalizeText(input.profile.firstName, 'Member').split(/\s+/)[0] ?? 'Member';
    const city = normalizeText(input.profile.city, 'New York, NY');
    const profession = normalizeText(input.profile.profession, 'Professional');
    const topVibes = input.vibes.slice(0, 5);
    const bio = [
      input.intent,
      topVibes.length ? `Values: ${topVibes.join(', ')}` : '',
      input.alignment.family ? `Family rhythm: ${input.alignment.family}` : '',
    ].filter(Boolean).join(' · ');
    const uploadedVoicePath = input.voiceIntroUri
      ? await uploadCurrentUserProfileMedia('voice', input.voiceIntroUri)
      : null;

    const profile = await upsertCurrentUserProfile({
      first_name: firstName,
      birth_date: birthDateFromAge(input.profile.age),
      city,
      profession,
      height_cm: heightToCm(input.profile.height),
      religion: input.profile.religion.trim() || null,
      community: input.profile.community.trim() || null,
      bio: bio || null,
      verified: input.verified,
      onboarding_complete: true,
      voice_intro_path: uploadedVoicePath ?? (input.voiceIntroUri || null),
    });

    const uploadedPhotoPaths = input.photos.length
      ? await uploadCurrentUserProfilePhotos(input.photos)
      : null;
    if (uploadedPhotoPaths?.length) {
      await replaceCurrentUserProfilePhotos(uploadedPhotoPaths);
    }

    await upsertUserPreferences({
      intent: intentToDatabase(input.intent),
      vibes: topVibes,
      marriage_timeline: input.alignment.timeline ?? null,
      children: input.alignment.children ?? null,
      family_involvement: input.alignment.family ?? null,
      relocation: input.alignment.relocation ?? null,
      smart_discovery: input.smartDiscovery,
      crossed_paths: input.crossedPaths,
    });

    await upsertPrivacySettings({
      last_seen_visible: input.lastSeenVisible,
      online_status_visible: input.lastSeenVisible,
      profile_view_notifications: true,
      private_mode: false,
      profile_view_threshold_seconds: 5,
    });

    // Selfie verification media needs a liveness/ID verification provider before
    // public launch. Profile photos and voice intro are uploaded above.
    void input.selfieUri;

    return profile;
  });
}

export async function persistChatSettings(matchId: string, settings: CoupleChatSettings) {
  if (!isBackendUuid(matchId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => saveChatSettings(matchId, settings));
}

export async function persistLiveLocationShare(matchId: string, location: NonNullable<ChatMessage['location']>) {
  if (!isBackendUuid(matchId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  const expiresAt = location.expiresAt;
  if (!expiresAt) return { saved: false, reason: 'demo' } satisfies PersistenceResult;
  return persistSafely(() => createLiveLocationShare({
    matchId,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracyM: location.accuracy ?? null,
    expiresAt: new Date(expiresAt).toISOString(),
  }));
}
