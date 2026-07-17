import type { ChatMessage, CoupleChatSettings, DatePlanStatus, ProfileDraft, RelationshipReflectionChoice } from '../storage';
import { sanitizeRelationshipJourneyProperties, type RelationshipJourneyEventName } from '../domain/relationshipLearning';
import {
  blockMember,
  clearMatchingLearning,
  createDateProposal,
  completeDateProposal,
  createLiveLocationShare,
  fetchRelationshipJourney,
  fetchMatchMessages,
  recordProfileView,
  recordDiscoverySignal,
  recordRelationshipJourneyEvent,
  respondToDateProposal,
  reportMember,
  saveCurrentMemberProfile,
  saveMatchingPreferences,
  saveChatSettings,
  saveRelationshipReflection,
  setRelationshipReminder,
  sendCurrentUserMessage,
  subscribeToChatMessages,
  submitIcebreakerAnswer,
  submitMatchFeedback,
  submitMatchDecision,
  unmatchMember,
  uploadCurrentUserProfileMedia,
  uploadCurrentUserProfilePhotos,
  upsertPrivacySettings,
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

export async function persistDatePlanStatus(proposalId: string | undefined, status: DatePlanStatus) {
  if (!proposalId || !isBackendUuid(proposalId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  if (status === 'completed') return persistSafely(() => completeDateProposal(proposalId));
  if (status === 'proposed') return { saved: false, reason: 'demo' } satisfies PersistenceResult;
  return persistSafely(() => respondToDateProposal(proposalId, status));
}

export async function persistRelationshipReflection(proposalId: string | undefined, choice: RelationshipReflectionChoice, useForMatching = false) {
  if (!proposalId || !isBackendUuid(proposalId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => saveRelationshipReflection(proposalId, choice, useForMatching));
}

export async function persistRelationshipReminder(proposalId: string | undefined, enabled: boolean) {
  if (!proposalId || !isBackendUuid(proposalId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => setRelationshipReminder(proposalId, enabled));
}

export async function persistRelationshipJourneyEvent(eventName: RelationshipJourneyEventName, properties: Record<string,unknown>) {
  const sanitized=sanitizeRelationshipJourneyProperties(properties) as Record<string,string|boolean>;
  return persistSafely(() => recordRelationshipJourneyEvent(eventName, sanitized));
}

export async function fetchPersistedRelationshipJourney(matchId: string) {
  if (!isBackendUuid(matchId)) return null;
  try {
    return await fetchRelationshipJourney(matchId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load relationship journey.';
    console.warn('[DestinyOne relationship journey]', message);
    return null;
  }
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
  return persistSafely(() => recordDiscoverySignal(targetProfileId, signal, `discovery-${signal}-${Date.now()}`));
}

export async function persistMatchDecision(targetProfileId: string, decision: 'interested' | 'pass') {
  if (!isBackendUuid(targetProfileId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => submitMatchDecision(targetProfileId, decision));
}

export async function persistMatchFeedback(matchId: string, feedback: 'promising' | 'not_aligned' | 'met_in_person', useForMatching: boolean) {
  if (!isBackendUuid(matchId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => submitMatchFeedback(matchId, feedback, useForMatching, `match-feedback-${Date.now()}`));
}

export async function persistIcebreakerAnswer(matchId: string, question: string, answer: string) {
  if (!isBackendUuid(matchId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => submitIcebreakerAnswer(matchId, question, answer));
}

export async function persistReport(reportedId: string, reason: string, details: string | undefined, clientActionId: string) {
  if (!isBackendUuid(reportedId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => reportMember(reportedId, reason, details, clientActionId));
}

export async function persistBlock(blockedId: string) {
  if (!isBackendUuid(blockedId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => blockMember(blockedId));
}

export async function persistUnmatch(matchId: string, clientActionId: string) {
  if (!isBackendUuid(matchId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => unmatchMember(matchId, clientActionId));
}

export async function persistPrivacySettings(settings: {
  lastSeenVisible?: boolean;
  onlineStatusVisible?: boolean;
  privateMode?: boolean;
  profileViewNotifications?: boolean;
  analyticsConsent?: boolean;
}) {
  return persistSafely(() => upsertPrivacySettings({
    last_seen_visible: settings.lastSeenVisible,
    online_status_visible: settings.onlineStatusVisible,
    private_mode: settings.privateMode,
    profile_view_notifications: settings.profileViewNotifications,
    analytics_consent: settings.analyticsConsent,
  }));
}

export type OnboardingProfileSyncInput = {
  profile: ProfileDraft;
  photos: string[];
  selfieUri: string;
  voiceIntroUri: string;
  vibes: string[];
  intent: string;
  alignment: Record<string, string>;
  smartDiscovery: boolean;
  crossedPaths: boolean;
  lastSeenVisible: boolean;
  matchFilters: import('../storage').MatchFilters;
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

function matchingAttributesFromAlignment(alignment: Record<string, string>) {
  const familyPriority = alignment.family?.includes('deeply')
    ? 'high' as const
    : alignment.family?.includes('independent')
      ? 'independent' as const
      : 'balanced' as const;
  const childrenIntent = alignment.children?.includes('Definitely')
    ? 'wants' as const
    : alignment.children?.includes('Do not')
      ? 'does_not_want' as const
      : 'open' as const;
  const marriageTimeline = alignment.timeline?.includes('1–2')
    ? '1_2_years' as const
    : alignment.timeline?.includes('2–3')
      ? '2_3_years' as const
      : 'later' as const;
  const relocation = alignment.relocation?.includes('Yes')
    ? 'open' as const
    : alignment.relocation?.includes('stay')
      ? 'same_city' as const
      : 'open' as const;
  return { familyPriority, childrenIntent, marriageTimeline, relocation };
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

    const profilePayload = {
      first_name: firstName,
      birth_date: birthDateFromAge(input.profile.age),
      city,
      profession,
      height_cm: heightToCm(input.profile.height),
      religion: input.profile.religion.trim() || null,
      community: input.profile.community.trim() || null,
      bio: bio || null,
      voice_intro_path: uploadedVoicePath ?? (input.voiceIntroUri || null),
    };

    const uploadedPhotoPaths = input.photos.length
      ? await uploadCurrentUserProfilePhotos(input.photos)
      : null;
    const preferencesPayload = {
      intent: intentToDatabase(input.intent),
      vibes: topVibes,
      marriage_timeline: input.alignment.timeline ?? null,
      children: input.alignment.children ?? null,
      family_involvement: input.alignment.family ?? null,
      relocation: input.alignment.relocation ?? null,
      smart_discovery: input.smartDiscovery,
      crossed_paths: input.crossedPaths,
    };

    const profile = await saveCurrentMemberProfile(
      profilePayload,
      preferencesPayload,
      uploadedPhotoPaths,
    );

    await saveMatchingPreferences({
      filters: input.matchFilters,
      profile: input.profile,
      ...matchingAttributesFromAlignment(input.alignment),
      smartDiscovery: input.smartDiscovery,
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

export async function persistMatchingPreferences(input: {
  filters: import('../storage').MatchFilters;
  profile: ProfileDraft;
  alignment: Record<string, string>;
  smartDiscovery: boolean;
}) {
  return persistSafely(() => saveMatchingPreferences({
    filters: input.filters,
    profile: input.profile,
    ...matchingAttributesFromAlignment(input.alignment),
    smartDiscovery: input.smartDiscovery,
  }));
}

export async function persistClearMatchingLearning() {
  return persistSafely(() => clearMatchingLearning());
}

export async function persistChatSettings(matchId: string, settings: CoupleChatSettings) {
  if (!isBackendUuid(matchId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  return persistSafely(() => saveChatSettings(matchId, settings));
}

export async function persistLiveLocationShare(matchId: string, location: NonNullable<ChatMessage['location']>, clientActionId: string) {
  if (!isBackendUuid(matchId)) return { saved: false, reason: 'preview_id' } satisfies PersistenceResult;
  const expiresAt = location.expiresAt;
  if (!expiresAt) return { saved: false, reason: 'demo' } satisfies PersistenceResult;
  const durationMinutes = Math.max(5, Math.min(60, Math.ceil((expiresAt - Date.now()) / 60000)));
  return persistSafely(() => createLiveLocationShare({
    matchId,
    clientActionId,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracyM: location.accuracy ?? null,
    durationMinutes,
  }));
}
