import type { RealtimeChannel } from '@supabase/supabase-js';
import { backendReadinessError, backendRuntime, isSupabaseConfigured, supabase } from '../lib/supabase';
import type { ChatMessage, DatePlanStatus, RelationshipReflectionChoice } from '../storage';
import type { Database, Json, MessageRow } from '../types/database';
import { parseMemberBootstrap, type MemberBootstrap } from '../domain/memberBootstrap';
import { parseServerDailyMatch, type ServerDailyMatchRow } from '../domain/serverMatching';
import type { MatchFilters, ProfileDraft } from '../storage';
import { isValidEmail, isValidPassword, normalizeAuthPhone } from '../domain/validation';

export const backendMode = backendRuntime.mode === 'blocked' ? 'missing' : backendRuntime.mode;
export const allowsPreviewOtpFallback = backendRuntime.allowsDemoOtp;
// This is a deliberate local-preview escape hatch while delivery providers are
// being configured. It is impossible to enable in a production app build.
export const allowsPreviewAuthBypass =
  backendRuntime.appEnvironment !== 'production'
  && process.env.EXPO_PUBLIC_ENABLE_PREVIEW_AUTH_BYPASS === 'true';

const isDemoOtp = (token: string) => token === '123456' || token === '12345';

function isRecoverablePhoneOtpError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /sms|phone|otp|twilio|provider|not enabled|unsupported|confirmation code/i.test(message);
}

function toFriendlyAuthError(error: unknown, mode: 'email' | 'phone') {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : JSON.stringify(error ?? {});
  const normalized = message.trim();
  if (mode === 'email' && (/^\{\}$/.test(normalized) || /unexpected_failure|error sending confirmation email|could not send email/i.test(normalized))) {
    return 'We could not send the email code yet. DestinyOne email delivery needs a verified sender domain. Please try again once it is connected.';
  }
  if (/over_.*email.*rate_limit|email.*rate.*limit|rate.*limit/i.test(message)) {
    return 'Too many email codes were requested. Please wait a few minutes, then try again.';
  }
  if (mode === 'phone' && /sms|twilio|phone.*provider|provider.*not enabled|unsupported/i.test(message)) {
    return 'Phone verification is not available yet. Please continue with email for now.';
  }
  if (/email.*invalid|invalid.*email/i.test(message)) return 'Enter a valid email address.';
  if (/otp.*expired|token.*expired/i.test(message)) return 'That code expired. Request a new one and try again.';
  if (/invalid.*otp|invalid.*token|token.*not found/i.test(message)) return 'That code does not match. Check the newest code and try again.';
  return message || 'Authentication is temporarily unavailable. Please try again.';
}

function getEmailRedirectTo() {
  const maybeLocation = typeof globalThis !== 'undefined'
    ? (globalThis as { location?: { origin?: string } }).location
    : undefined;
  const origin = maybeLocation?.origin;
  return origin?.startsWith('http') ? `${origin}/` : undefined;
}

function ensureBackendConfigured() {
  if (backendReadinessError) throw new Error(backendReadinessError);
}

async function establishPreviewSession() {
  if (!isSupabaseConfigured || !allowsPreviewAuthBypass) return;
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) return;

  // Anonymous auth gives the preview a real, bounded Supabase identity. This
  // keeps server-protected APIs such as Google Places usable without exposing
  // an SMS or email verification shortcut in production.
  const { error } = await supabase.auth.signInAnonymously();
  if (error) console.info('[DestinyOne preview] Anonymous session unavailable; local preview remains available.');
}

export type ProfileMediaKind = 'photo' | 'voice' | 'verification';
type ChatMediaKind = 'image' | 'gif' | 'snap' | 'sticker' | 'voice';

const profileMediaLimitBytes = 10 * 1024 * 1024;
const imageMediaTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};
const voiceMediaTypes: Record<string, string> = {
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/aac': 'aac',
};

function inferredProfileMediaType(kind: ProfileMediaKind, uri: string) {
  const extension = uri.split('?')[0]?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (kind === 'voice') {
    if (extension === 'mp3') return 'audio/mpeg';
    if (extension === 'wav') return 'audio/wav';
    if (extension === 'aac') return 'audio/aac';
    return 'audio/mp4';
  }
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic') return 'image/heic';
  if (extension === 'heif') return 'image/heif';
  return 'image/jpeg';
}

export function validateProfileMediaUpload(kind: ProfileMediaKind, file: { size: number; type?: string }, uri: string) {
  if (!Number.isFinite(file.size) || file.size <= 0) throw new Error('The selected media file is empty.');
  if (file.size > profileMediaLimitBytes) throw new Error('Profile media must be 10 MB or smaller.');
  const contentType = (file.type?.split(';')[0]?.trim().toLowerCase() || inferredProfileMediaType(kind, uri));
  const allowedTypes = kind === 'voice' ? voiceMediaTypes : imageMediaTypes;
  const extension = allowedTypes[contentType];
  if (!extension) throw new Error(kind === 'voice' ? 'Choose an M4A, MP3, WAV, or AAC recording.' : 'Choose a JPEG, PNG, WebP, HEIC, or HEIF image.');
  return { contentType, extension };
}

function extensionForChatMedia(kind: ChatMediaKind, uri: string, blobType?: string) {
  if (blobType?.includes('png')) return 'png';
  if (blobType?.includes('webp')) return 'webp';
  if (blobType?.includes('gif')) return 'gif';
  if (blobType?.includes('mpeg')) return 'mp3';
  if (blobType?.includes('wav')) return 'wav';
  if (blobType?.includes('mp4')) return kind === 'voice' ? 'm4a' : 'mp4';
  const cleanUri = uri.split('?')[0] ?? uri;
  const match = cleanUri.match(/\.([a-z0-9]{2,5})$/i);
  if (match?.[1]) return match[1].toLowerCase();
  if (kind === 'voice') return 'm4a';
  if (kind === 'gif') return 'gif';
  return 'jpg';
}

function shouldUploadMediaUri(uri?: string) {
  if (!uri) return false;
  return !/^(https?:|blob:chat-media|chat-media\/)/i.test(uri);
}

async function uriToBlob(uri: string) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not read selected media file.');
  return response.blob();
}

export type AuthRequest =
  | { mode: 'phone'; phone: string }
  | { mode: 'email'; email: string; password: string };

export async function beginAuthentication(request: AuthRequest) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return { demo: true } as const;
  if (request.mode === 'phone') {
    const phone = normalizeAuthPhone(request.phone);
    if (!phone) throw new Error('Enter a valid phone number with country code.');
    if (allowsPreviewAuthBypass) {
      await establishPreviewSession();
      return { demo: true, bypassed: true } as const;
    }
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      // Development preview should stay easy to enter while Supabase SMS/Twilio
      // is still being configured. Production must use real Supabase OTP only.
      if (allowsPreviewOtpFallback && isRecoverablePhoneOtpError(error)) {
        return { demo: true, fallbackReason: error.message } as const;
      }
      throw new Error(toFriendlyAuthError(error, 'phone'));
    }
    return { demo: false } as const;
  }

  // Use email OTP for the real app flow so email users must verify before the
  // profile opens. After verification, verifyAuthentication can attach the
  // chosen password to the newly authenticated Supabase user.
  const email = request.email.trim().toLowerCase();
  if (!isValidEmail(email)) throw new Error('Enter a valid email address.');
  if (!isValidPassword(request.password)) throw new Error('Use at least 10 characters with uppercase, lowercase, and a number.');
  if (allowsPreviewAuthBypass) {
    await establishPreviewSession();
    return { demo: true, bypassed: true } as const;
  }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: getEmailRedirectTo(),
      data: { auth_flow: 'email_otp_with_password' },
    },
  });
  if (error) throw new Error(toFriendlyAuthError(error, 'email'));
  return { demo: false } as const;
}

export async function verifyAuthentication(destination: string, token: string, password?: string) {
  ensureBackendConfigured();
  const isEmailDestination = destination.includes('@');

  if (allowsPreviewAuthBypass) {
    if (!isDemoOtp(token)) return false;
    if (isEmailDestination && !isValidPassword(password ?? '')) {
      throw new Error('Use at least 10 characters with uppercase, lowercase, and a number.');
    }
    return true;
  }

  if (!isSupabaseConfigured) {
    if (isEmailDestination) {
      throw new Error('Real email verification requires Supabase to be connected.');
    }
    return isDemoOtp(token);
  }

  // Preview/demo OTP is intentionally phone-only. Email must use the real
  // Supabase email OTP so fake accounts cannot bypass email verification.
  if (!isEmailDestination && allowsPreviewOtpFallback && isDemoOtp(token)) {
    return true;
  }

  if (isEmailDestination) {
    const email = destination.trim().toLowerCase();
    const strongPassword = password ?? '';
    if (!isValidEmail(email)) throw new Error('Enter a valid email address.');
    if (!isValidPassword(strongPassword)) throw new Error('Use at least 10 characters with uppercase, lowercase, and a number.');
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw new Error(toFriendlyAuthError(error, 'email'));

    // Optional password is collected in onboarding and set only after the email
    // OTP succeeds. Backend can later enforce password policy/server checks.
    const { error: passwordError } = await supabase.auth.updateUser({ password: strongPassword });
    if (passwordError) throw passwordError;
    return true;
  }
  const phone = normalizeAuthPhone(destination);
  if (!phone) throw new Error('Enter a valid phone number with country code.');
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw new Error(toFriendlyAuthError(error, 'phone'));
  return true;
}

export async function saveCurrentMemberProfile(
  profile: Json,
  preferences: Json,
  photoPaths: string[] | null,
) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('save_current_member_profile', {
    p_profile: profile,
    p_preferences: preferences,
    p_photo_paths: photoPaths,
  });
  if (error) throw error;
  return data;
}

export async function uploadCurrentUserProfileMedia(kind: ProfileMediaKind, uri: string, position = 0) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured || !uri) return null;
  if (/^profile-media\//.test(uri)) return uri.replace(/^profile-media\//, '');
  const userId = await requireCurrentUserId();
  const blob = await uriToBlob(uri);
  const { contentType, extension } = validateProfileMediaUpload(kind, blob, uri);
  const safePosition = Math.max(0, Math.min(99, position));
  const mediaPath = `${userId}/${kind}/${Date.now()}-${safePosition}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { data, error } = await supabase.storage.from('profile-media').upload(mediaPath, blob, {
    cacheControl: '3600',
    contentType,
    upsert: false,
  });
  if (error) throw error;
  return data.path;
}

export async function uploadCurrentUserProfilePhotos(uris: string[]) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const uploaded: string[] = [];
  for (const [index, uri] of uris.slice(0, 6).entries()) {
    if (!uri) continue;
    const path = await uploadCurrentUserProfileMedia('photo', uri, index);
    if (path) uploaded.push(path);
  }
  return uploaded;
}

export async function uploadCurrentUserChatMedia(matchId: string, kind: ChatMediaKind, uri: string) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured || !uri) return null;
  if (/^chat-media\//.test(uri)) return uri.replace(/^chat-media\//, '');
  if (/^https?:/i.test(uri)) return uri;
  const userId = await requireCurrentUserId();
  const blob = await uriToBlob(uri);
  const contentType = blob.type || (kind === 'voice' ? 'audio/m4a' : kind === 'gif' ? 'image/gif' : 'image/jpeg');
  const extension = extensionForChatMedia(kind, uri, contentType);
  const mediaPath = `${matchId}/${userId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { data, error } = await supabase.storage.from('chat-media').upload(mediaPath, blob, {
    cacheControl: '3600',
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return data.path;
}

export async function fetchDailyMatches(limit = 5) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('daily_matches', { result_limit: limit });
  if (error) throw error;
  const rows = (data ?? []) as ServerDailyMatchRow[];
  const parsed = await Promise.all(rows.map(async (row) => {
    const paths = Array.isArray(row.photo_paths) ? row.photo_paths : [];
    if (!paths.length) return null;
    const { data: signed, error: signedError } = await supabase.storage
      .from('profile-media')
      .createSignedUrls(paths, 3600);
    if (signedError) throw signedError;
    const signedUrls = (signed ?? []).map((item) => item.signedUrl).filter((url): url is string => typeof url === 'string');
    return parseServerDailyMatch(row, signedUrls);
  }));
  return parsed.filter((match): match is NonNullable<typeof match> => match !== null);
}

export type MatchingPoolStatus = {
  status: 'ready' | 'sparse' | 'empty' | 'profile_incomplete' | 'verification_required' | 'preferences_incomplete';
  eligibleCount: number;
  dailyLimit: number;
  repeatCooldownDays: number;
  suggestions: string[];
};

export async function fetchMatchingPoolStatus(): Promise<MatchingPoolStatus | null> {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('get_matching_pool_status');
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('The matching pool returned an invalid status.');
  const value = data as Record<string, unknown>;
  const validStatuses: MatchingPoolStatus['status'][] = ['ready','sparse','empty','profile_incomplete','verification_required','preferences_incomplete'];
  if (!validStatuses.includes(value.status as MatchingPoolStatus['status'])) throw new Error('The matching pool returned an invalid status.');
  return {
    status: value.status as MatchingPoolStatus['status'],
    eligibleCount: Math.max(0,Number(value.eligible_count)||0),
    dailyLimit: Math.max(1,Math.min(5,Number(value.daily_limit)||5)),
    repeatCooldownDays: Math.max(1,Math.min(30,Number(value.repeat_cooldown_days)||14)),
    suggestions: Array.isArray(value.suggestions)?value.suggestions.filter((item):item is string=>typeof item==='string'&&item.trim().length>0).slice(0,3):[],
  };
}

function intentFilterToDatabase(intent: string) {
  const value = intent.toLowerCase();
  if (value.includes('leading') || (value.includes('long') && value.includes('marriage'))) return 'long_term_to_marriage';
  if (value.includes('marriage')) return 'marriage';
  return 'long_term';
}

function lookingForToDatabase(value: MatchFilters['lookingFor']) {
  return value === 'Women' ? 'women' : value === 'Men' ? 'men' : 'everyone';
}

export async function saveMatchingPreferences(input: {
  filters: MatchFilters;
  profile: Pick<ProfileDraft, 'gender'>;
  familyPriority?: 'high' | 'balanced' | 'independent';
  childrenIntent?: 'wants' | 'open' | 'does_not_want';
  marriageTimeline?: '1_2_years' | '2_3_years' | 'later';
  relocation?: 'open' | 'same_city' | 'not_open';
  languages?: string[];
  smartDiscovery: boolean;
}) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('save_matching_preferences', {
    p_preferences: {
      looking_for: lookingForToDatabase(input.filters.lookingFor),
      min_age: input.filters.minAge,
      max_age: input.filters.maxAge,
      cities: input.filters.cities,
      intents: input.filters.intents.map(intentFilterToDatabase),
      must_have_vibes: input.filters.mustHaveVibes,
      family_priority: input.filters.familyPriority,
      children: input.filters.children,
      marriage_timeline: input.filters.marriageTimeline,
      relocation: input.filters.relocation,
      distance_preference: input.filters.distancePreference,
      smart_discovery: input.smartDiscovery,
    },
    p_attributes: {
      gender: input.profile.gender,
      family_priority: input.familyPriority ?? 'balanced',
      children_intent: input.childrenIntent ?? 'open',
      marriage_timeline: input.marriageTimeline ?? '2_3_years',
      relocation: input.relocation ?? 'open',
      languages: input.languages ?? [],
    },
  });
  if (error) throw error;
  return data;
}

export async function clearMatchingLearning() {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { error } = await supabase.rpc('clear_matching_learning');
  if (error) throw error;
  return true;
}

export type MatchDecision = 'interested' | 'pass';
export type MatchFeedback = 'promising' | 'not_aligned' | 'met_in_person';

export async function submitMatchDecision(recipientId: string, decision: MatchDecision) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('submit_match_decision', {
    p_recipient_id: recipientId,
    p_decision: decision,
  });
  if (error) throw error;
  return data;
}

export async function submitMatchFeedback(matchId: string, feedback: MatchFeedback, useForMatching: boolean, clientActionId: string) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('submit_match_feedback', {
    p_match_id: matchId,
    p_feedback: feedback,
    p_use_for_matching: useForMatching,
    p_client_action_id: clientActionId,
  });
  if (error) throw error;
  return data;
}

export async function recordDiscoverySignal(targetId: string, signal: 'view' | 'interested' | 'skip', clientActionId: string) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('record_discovery_signal', {
    p_target_id: targetId,
    p_signal: signal,
    p_client_action_id: clientActionId,
  });
  if (error) throw error;
  return data;
}

export async function submitIcebreakerAnswer(matchId: string, question: string, answer: string) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('submit_icebreaker_answer', {
    p_match_id: matchId,
    p_question: question,
    p_answer: answer,
  });
  if (error) throw error;
  return data;
}

export async function fetchIcebreaker(matchId: string) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from('icebreakers').select('*').eq('match_id', matchId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMatchMessages(matchId: string, limit = 50) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return Promise.all([...(data ?? [])].reverse().map(row => messageRowToChatMessage(row as MessageRow)));
}

async function prepareChatMessageForBackend(matchId: string, message: ChatMessage): Promise<ChatMessage> {
  const next: ChatMessage = { ...message };
  if ((next.type === 'image' || next.type === 'snap' || next.type === 'gif') && shouldUploadMediaUri(next.uri)) {
    next.uri = await uploadCurrentUserChatMedia(matchId, next.type, next.uri ?? '') ?? next.uri;
  }
  if (next.type === 'voice') {
    const voiceUri = next.voice?.uri ?? next.uri;
    if (shouldUploadMediaUri(voiceUri)) {
      const uploaded = await uploadCurrentUserChatMedia(matchId, 'voice', voiceUri ?? '');
      next.uri = uploaded ?? next.uri;
      next.voice = next.voice ? { ...next.voice, uri: uploaded ?? next.voice.uri } : undefined;
    }
  }
  if (next.type === 'sticker' && next.sticker?.faceUri && shouldUploadMediaUri(next.sticker.faceUri)) {
    const uploaded = await uploadCurrentUserChatMedia(matchId, 'sticker', next.sticker.faceUri);
    next.sticker = { ...next.sticker, faceUri: uploaded ?? next.sticker.faceUri };
    next.uri = uploaded ?? next.uri;
  }
  return next;
}

function metadataObject(metadata: Json): Record<string, unknown> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {};
}

async function resolveChatMediaUri(path?: string | null) {
  if (!path) return undefined;
  if (/^(https?:|file:|data:|blob:)/i.test(path)) return path;
  const cleanPath = path.replace(/^chat-media\//, '');
  const { data, error } = await supabase.storage.from('chat-media').createSignedUrl(cleanPath, 60 * 60);
  if (error) return path;
  return data.signedUrl;
}

export async function messageRowToChatMessage(row: MessageRow): Promise<ChatMessage> {
  const metadata = metadataObject(row.metadata);
  const mediaUri = await resolveChatMediaUri(row.media_path);
  const voice = metadata.voice && typeof metadata.voice === 'object' ? metadata.voice as NonNullable<ChatMessage['voice']> : undefined;
  const sticker = metadata.sticker && typeof metadata.sticker === 'object' ? metadata.sticker as NonNullable<ChatMessage['sticker']> : undefined;
  const resolvedVoiceUri = voice?.uri ? await resolveChatMediaUri(voice.uri) : undefined;
  const resolvedStickerUri = sticker?.faceUri ? await resolveChatMediaUri(sticker.faceUri) : undefined;
  return {
    id: row.id,
    type: row.kind,
    text: row.body ?? undefined,
    uri: mediaUri,
    gift: metadata.gift && typeof metadata.gift === 'object' ? metadata.gift as ChatMessage['gift'] : undefined,
    snap: metadata.snap && typeof metadata.snap === 'object' ? metadata.snap as ChatMessage['snap'] : undefined,
    sticker: sticker ? { ...sticker, faceUri: resolvedStickerUri ?? sticker.faceUri } : undefined,
    voice: voice ? { ...voice, uri: resolvedVoiceUri ?? voice.uri } : undefined,
    location: metadata.location && typeof metadata.location === 'object' ? metadata.location as ChatMessage['location'] : undefined,
    date: metadata.date && typeof metadata.date === 'object' ? metadata.date as ChatMessage['date'] : undefined,
    createdAt: Date.parse(row.created_at),
    status: row.read_at ? 'read' : 'delivered',
  };
}

export async function sendMessage(matchId: string, message: ChatMessage) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const prepared = await prepareChatMessageForBackend(matchId, message);
  const mediaPath = prepared.uri ?? prepared.voice?.uri ?? prepared.sticker?.faceUri ?? null;
  const metadata = {
    ...(prepared.gift ? { gift: prepared.gift } : {}),
    ...(prepared.date ? { date: prepared.date } : {}),
    ...(prepared.snap ? { snap: prepared.snap } : {}),
    ...(prepared.sticker ? { sticker: prepared.sticker } : {}),
    ...(prepared.voice ? { voice: prepared.voice } : {}),
    ...(prepared.location ? { location: prepared.location } : {}),
  };
  const { data, error } = await supabase.rpc('send_match_message', {
    p_match_id: matchId,
    p_client_message_id: message.id,
    p_kind: prepared.type,
    p_body: prepared.text ?? null,
    p_media_path: mediaPath,
    p_metadata: metadata,
  });
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid chat response.');
  return messageRowToChatMessage(data as unknown as MessageRow);
}

export async function sendCurrentUserMessage(matchId: string, message: ChatMessage) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  return sendMessage(matchId, message);
}

const weekdayIndexes: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function proposedAtFromLabel(label: string) {
  const now = new Date();
  const lower = label.toLowerCase();
  const weekday = Object.entries(weekdayIndexes).find(([name]) => lower.includes(name));
  const timeMatch = label.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  const date = new Date(now);

  if (weekday) {
    let daysAhead = (weekday[1] - now.getDay() + 7) % 7;
    if (daysAhead === 0) daysAhead = 7;
    date.setDate(now.getDate() + daysAhead);
  } else {
    date.setDate(now.getDate() + 2);
  }

  if (timeMatch) {
    const hourBase = Number.parseInt(timeMatch[1] ?? '7', 10);
    const minute = Number.parseInt(timeMatch[2] ?? '0', 10);
    const meridiem = (timeMatch[3] ?? 'pm').toLowerCase();
    const hour = meridiem === 'pm' ? (hourBase % 12) + 12 : hourBase % 12;
    date.setHours(hour, Number.isFinite(minute) ? minute : 0, 0, 0);
  } else {
    date.setHours(19, 0, 0, 0);
  }

  return date.toISOString();
}

export async function createDateProposal(matchId: string, date: NonNullable<ChatMessage['date']>) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('create_date_proposal', {
    p_match_id: matchId,
    p_venue_name: date.venue,
    p_area_label: date.area,
    p_proposed_at: proposedAtFromLabel(date.time),
    p_safety_check_in: date.safetyCheckIn,
  });
  if (error) throw error;
  return data;
}

export async function respondToDateProposal(proposalId: string, response: Extract<DatePlanStatus,'accepted'|'declined'|'countered'>) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('respond_to_date_proposal', {
    p_date_proposal_id: proposalId,
    p_response: response,
  });
  if (error) throw error;
  return data;
}

export async function completeDateProposal(proposalId: string) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('complete_date_proposal', {
    p_date_proposal_id: proposalId,
  });
  if (error) throw error;
  return data;
}

export async function saveRelationshipReflection(proposalId: string, choice: RelationshipReflectionChoice, useForMatching = false) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('upsert_relationship_reflection', {
    p_date_proposal_id: proposalId,
    p_choice: choice,
    p_use_for_matching: useForMatching,
  });
  if (error) throw error;
  return data;
}

export async function setRelationshipReminder(proposalId: string, enabled: boolean) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('set_relationship_reminder', {
    p_date_proposal_id: proposalId,
    p_enabled: enabled,
  });
  if (error) throw error;
  return data;
}

export async function recordRelationshipJourneyEvent(eventName: string, properties: Record<string,string|boolean>) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('record_relationship_journey_event', {
    p_event_name: eventName,
    p_properties: properties,
  });
  if (error) throw error;
  return data;
}

export async function fetchRelationshipJourney(matchId: string) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('get_relationship_journey', { p_match_id: matchId });
  if (error) throw error;
  return data;
}

export function subscribeToMessages(matchId: string, onMessage: (payload: unknown) => void): RealtimeChannel | null {
  if (!isSupabaseConfigured) return null;
  return supabase.channel(`match:${matchId}`).on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
    onMessage,
  ).subscribe();
}

export function subscribeToChatMessages(matchId: string, onMessage: (message: ChatMessage) => void): RealtimeChannel | null {
  if (!isSupabaseConfigured) return null;
  return supabase.channel(`chat:${matchId}`).on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
    payload => {
      const row = (payload as unknown as { new?: MessageRow }).new;
      if (!row) return;
      void messageRowToChatMessage(row).then(onMessage);
    },
  ).subscribe();
}

export async function signOut() {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export async function loadCurrentMemberBootstrap(): Promise<MemberBootstrap | null> {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;
  const { data, error } = await supabase.rpc('get_current_member_bootstrap');
  if (error) throw error;
  return parseMemberBootstrap(data);
}

export async function reportMember(reportedId: string, reason: string, details: string | undefined, clientActionId: string) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('submit_member_report', {
    p_reported_id: reportedId,
    p_reason: reason,
    p_details: details ?? null,
    p_client_action_id: clientActionId,
  });
  if (error) throw error;
  return data;
}

export async function blockMember(blockedId: string) {
  if (!isSupabaseConfigured) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to block a member.');
  const { error } = await supabase.rpc('block_member', { p_blocked_id: blockedId });
  if (error) throw error;
  return true;
}

export async function unmatchMember(matchId: string, clientActionId: string) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('unmatch_member', {
    p_match_id: matchId,
    p_client_action_id: clientActionId,
  });
  if (error) throw error;
  return data;
}

async function requireCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to continue.');
  return user.id;
}

export type SupportTopic = Database['public']['Tables']['support_tickets']['Insert']['topic'];

export async function submitSupportTicket(topic: SupportTopic, message: string, metadata: Json = {}, sourceScreen = 'app') {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const userId = await requireCurrentUserId();
  const priority: Database['public']['Tables']['support_tickets']['Insert']['priority'] =
    topic === 'Safety' ? 'urgent' : topic === 'Billing' || topic === 'Gift order' ? 'high' : 'normal';
  const { data, error } = await supabase.from('support_tickets').insert({
    user_id: userId,
    topic,
    message,
    priority,
    source_screen: sourceScreen,
    metadata,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function submitModerationAppeal(caseId: string, reason: string) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('submit_moderation_appeal', {
    p_case_id: caseId,
    p_reason: reason,
    p_client_action_id: `appeal-${Date.now()}`,
  });
  if (error) throw error;
  return data;
}

export async function upsertPrivacySettings(settings: Partial<Omit<Database['public']['Tables']['privacy_settings']['Insert'], 'user_id'>>) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const userId = await requireCurrentUserId();
  const { data, error } = await supabase.from('privacy_settings').upsert({
    user_id: userId,
    ...settings,
    updated_at: new Date().toISOString(),
  }).select().single();
  if (error) throw error;
  return data;
}

export async function recordProfileView(viewedUserId: string, durationSeconds = 5, source = 'profile_detail') {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('record_profile_view', {
    viewed_user_id: viewedUserId,
    duration_seconds: durationSeconds,
    source,
  });
  if (error) throw error;
  return data;
}

export async function fetchNotifications(limit = 30) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const userId = await requireCurrentUserId();
  const { data, error } = await supabase
    .from('member_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function markNotificationRead(notificationId: string) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { error } = await supabase.rpc('mark_notification_read', { notification_id: notificationId });
  if (error) throw error;
  return true;
}

export async function saveChatSettings(matchId: string, settings: { nickname?: string; theme?: string; retentionMode?: 'keep' | 'after_seen' | '24_hours' | '7_days'; screenshotAlerts?: boolean }) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const userId = await requireCurrentUserId();
  const { data, error } = await supabase.from('chat_settings').upsert({
    match_id: matchId,
    user_id: userId,
    nickname: settings.nickname ?? null,
    theme: settings.theme ?? 'Ruby Velvet',
    retention_mode: settings.retentionMode ?? 'keep',
    screenshot_alerts: settings.screenshotAlerts ?? true,
    updated_at: new Date().toISOString(),
  }).select().single();
  if (error) throw error;
  return data;
}

export async function createLiveLocationShare(input: {
  matchId: string;
  clientActionId: string;
  latitude: number;
  longitude: number;
  accuracyM?: number | null;
  durationMinutes?: number;
}) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('start_live_location_share', {
    p_match_id: input.matchId,
    p_client_action_id: input.clientActionId,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_accuracy_m: input.accuracyM ?? null,
    p_duration_minutes: input.durationMinutes ?? 30,
  });
  if (error) throw error;
  return data;
}

export async function requestAccountDeletion() {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('request_account_deletion');
  if (error) throw error;
  await supabase.auth.signOut();
  return data;
}

export async function joinCityWaitlist(input: {
  cityKey: string;
  locality: string;
  region: string;
  countryCode: 'US' | 'CA';
  source?: 'member' | 'referral' | 'ambassador' | 'event';
}) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('join_city_waitlist', {
    p_city_key: input.cityKey,
    p_locality: input.locality,
    p_region: input.region,
    p_country_code: input.countryCode,
    p_source: input.source ?? 'member',
  });
  if (error) throw error;
  return data;
}

export async function createCityReferral(cityKey: string) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('create_city_referral', { p_city_key: cityKey });
  if (error) throw error;
  return data;
}

export async function applyCityAmbassador(input: { cityKey: string; communityReach: string; hostingExperience: string }) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('apply_city_ambassador', {
    p_city_key: input.cityKey,
    p_community_reach: input.communityReach,
    p_hosting_experience: input.hostingExperience,
    p_safety_commitment: true,
  });
  if (error) throw error;
  return data;
}

export async function createMarketplaceQuote(input: {
  offeringId: string;
  slotId: string;
  partySize?: number;
  clientActionId: string;
}) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('create_marketplace_quote', {
    p_offering_id: input.offeringId,
    p_slot_id: input.slotId,
    p_party_size: input.partySize ?? 2,
    p_idempotency_key: input.clientActionId,
  });
  if (error) throw error;
  return data;
}

export async function createMarketplaceReservationOrder(input: {
  quoteId: string;
  matchId: string;
  clientActionId: string;
}) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('create_marketplace_reservation_order', {
    p_quote_id: input.quoteId,
    p_match_id: input.matchId,
    p_idempotency_key: input.clientActionId,
  });
  if (error) throw error;
  return data;
}

export async function respondMarketplaceReservationOrder(input: {
  orderId: string;
  accept: boolean;
  clientActionId: string;
}) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('respond_marketplace_reservation_order', {
    p_order_id: input.orderId,
    p_accept: input.accept,
    p_idempotency_key: input.clientActionId,
  });
  if (error) throw error;
  return data;
}

export async function cancelMarketplaceReservationOrder(input: {
  orderId: string;
  reason: string;
  clientActionId: string;
}) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('cancel_marketplace_reservation_order', {
    p_order_id: input.orderId,
    p_reason: input.reason,
    p_idempotency_key: input.clientActionId,
  });
  if (error) throw error;
  return data;
}

export async function requestMarketplaceRefund(input: {
  orderId: string;
  reason: string;
  clientActionId: string;
}) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('request_marketplace_refund', {
    p_order_id: input.orderId,
    p_reason: input.reason,
    p_idempotency_key: input.clientActionId,
  });
  if (error) throw error;
  return data;
}
