import type { RealtimeChannel } from '@supabase/supabase-js';
import { appEnvironment, backendReadinessError, isSupabaseConfigured, requiresRealBackend, supabase } from '../lib/supabase';
import type { ChatMessage } from '../storage';
import type { Database, Json, MessageRow, ProfileRow } from '../types/database';

export const backendMode = isSupabaseConfigured ? 'supabase' : requiresRealBackend ? 'missing' : 'demo';
export const allowsPreviewOtpFallback = appEnvironment !== 'production' && !requiresRealBackend;

const isDemoOtp = (token: string) => token === '123456' || token === '12345';

function isRecoverablePhoneOtpError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /sms|phone|otp|twilio|provider|not enabled|unsupported|confirmation code/i.test(message);
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

type ProfileMediaKind = 'photo' | 'voice' | 'verification';
type ChatMediaKind = 'image' | 'gif' | 'snap' | 'sticker' | 'voice';

function contentTypeForMedia(kind: ProfileMediaKind, blobType?: string) {
  if (blobType) return blobType;
  if (kind === 'voice') return 'audio/m4a';
  return 'image/jpeg';
}

function extensionForMedia(kind: ProfileMediaKind, uri: string, blobType?: string) {
  if (blobType?.includes('png')) return 'png';
  if (blobType?.includes('webp')) return 'webp';
  if (blobType?.includes('gif')) return 'gif';
  if (blobType?.includes('mpeg')) return 'mp3';
  if (blobType?.includes('wav')) return 'wav';
  if (blobType?.includes('mp4')) return kind === 'voice' ? 'm4a' : 'mp4';
  const cleanUri = uri.split('?')[0] ?? uri;
  const match = cleanUri.match(/\.([a-z0-9]{2,5})$/i);
  if (match?.[1]) return match[1].toLowerCase();
  return kind === 'voice' ? 'm4a' : 'jpg';
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
    const { error } = await supabase.auth.signInWithOtp({ phone: request.phone });
    if (error) {
      // Development preview should stay easy to enter while Supabase SMS/Twilio
      // is still being configured. Production must use real Supabase OTP only.
      if (allowsPreviewOtpFallback && isRecoverablePhoneOtpError(error)) {
        return { demo: true, fallbackReason: error.message } as const;
      }
      throw error;
    }
    return { demo: false } as const;
  }

  // Use email OTP for the real app flow so email users must verify before the
  // profile opens. After verification, verifyAuthentication can attach the
  // chosen password to the newly authenticated Supabase user.
  const { error } = await supabase.auth.signInWithOtp({
    email: request.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: getEmailRedirectTo(),
      data: { auth_flow: 'email_otp_with_password' },
    },
  });
  if (error) throw error;
  return { demo: false } as const;
}

export async function verifyAuthentication(destination: string, token: string, password?: string) {
  ensureBackendConfigured();
  const isEmailDestination = destination.includes('@');

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
    const { error } = await supabase.auth.verifyOtp({
      email: destination.trim(),
      token,
      type: 'email',
    });
    if (error) throw error;

    // Optional password is collected in onboarding and set only after the email
    // OTP succeeds. Backend can later enforce password policy/server checks.
    if (password && password.length >= 8) {
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;
    }
    return true;
  }
  const { error } = await supabase.auth.verifyOtp({ phone: destination, token, type: 'sms' });
  if (error) throw error;
  return true;
}

export async function upsertProfile(profile: Database['public']['Tables']['profiles']['Insert']) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from('profiles').upsert(profile).select().single();
  if (error) throw error;
  return data as ProfileRow;
}

export async function upsertCurrentUserProfile(profile: Omit<Database['public']['Tables']['profiles']['Insert'], 'id'>) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const userId = await requireCurrentUserId();
  return upsertProfile({
    id: userId,
    ...profile,
    updated_at: new Date().toISOString(),
  });
}

export async function upsertUserPreferences(preferences: Partial<Omit<Database['public']['Tables']['user_preferences']['Insert'], 'user_id'>>) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const userId = await requireCurrentUserId();
  const { data, error } = await supabase.from('user_preferences').upsert({
    user_id: userId,
    ...preferences,
    updated_at: new Date().toISOString(),
  }).select().single();
  if (error) throw error;
  return data;
}

export async function uploadCurrentUserProfileMedia(kind: ProfileMediaKind, uri: string, position = 0) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured || !uri) return null;
  if (/^profile-media\//.test(uri)) return uri.replace(/^profile-media\//, '');
  const userId = await requireCurrentUserId();
  const blob = await uriToBlob(uri);
  const contentType = contentTypeForMedia(kind, blob.type);
  const extension = extensionForMedia(kind, uri, contentType);
  const safePosition = Math.max(0, Math.min(99, position));
  const mediaPath = `${userId}/${kind}/${Date.now()}-${safePosition}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { data, error } = await supabase.storage.from('profile-media').upload(mediaPath, blob, {
    cacheControl: '3600',
    contentType,
    upsert: true,
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

export async function replaceCurrentUserProfilePhotos(storagePaths: string[]) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const userId = await requireCurrentUserId();
  const cleanPaths = storagePaths.filter(Boolean).slice(0, 6);
  const { error: deleteError } = await supabase.from('profile_photos').delete().eq('user_id', userId);
  if (deleteError) throw deleteError;
  if (cleanPaths.length === 0) return [];
  const rows = cleanPaths.map((storage_path, position) => ({
    user_id: userId,
    storage_path,
    position,
    approved: false,
  }));
  const { data, error } = await supabase.from('profile_photos').insert(rows).select();
  if (error) throw error;
  return data;
}

export async function uploadCurrentUserChatMedia(kind: ChatMediaKind, uri: string) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured || !uri) return null;
  if (/^chat-media\//.test(uri)) return uri.replace(/^chat-media\//, '');
  if (/^https?:/i.test(uri)) return uri;
  const userId = await requireCurrentUserId();
  const blob = await uriToBlob(uri);
  const contentType = blob.type || (kind === 'voice' ? 'audio/m4a' : kind === 'gif' ? 'image/gif' : 'image/jpeg');
  const extension = extensionForChatMedia(kind, uri, contentType);
  const mediaPath = `${userId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
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
  return data;
}

export type MatchDecision = 'interested' | 'pass';

export async function submitMatchDecision(recipientId: string, decision: MatchDecision) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('submit_match_decision', {
    recipient_id: recipientId,
    decision,
  });
  if (error) throw error;
  return data;
}

export async function recordDiscoverySignal(targetId: string, signal: 'view' | 'interested' | 'skip') {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const userId = await requireCurrentUserId();
  const { data, error } = await supabase.from('discovery_signals').insert({
    user_id: userId,
    target_id: targetId,
    signal,
  }).select().single();
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

async function prepareChatMessageForBackend(message: ChatMessage): Promise<ChatMessage> {
  const next: ChatMessage = { ...message };
  if ((next.type === 'image' || next.type === 'snap' || next.type === 'gif') && shouldUploadMediaUri(next.uri)) {
    next.uri = await uploadCurrentUserChatMedia(next.type, next.uri ?? '') ?? next.uri;
  }
  if (next.type === 'voice') {
    const voiceUri = next.voice?.uri ?? next.uri;
    if (shouldUploadMediaUri(voiceUri)) {
      const uploaded = await uploadCurrentUserChatMedia('voice', voiceUri ?? '');
      next.uri = uploaded ?? next.uri;
      next.voice = next.voice ? { ...next.voice, uri: uploaded ?? next.voice.uri } : undefined;
    }
  }
  if (next.type === 'sticker' && next.sticker?.faceUri && shouldUploadMediaUri(next.sticker.faceUri)) {
    const uploaded = await uploadCurrentUserChatMedia('sticker', next.sticker.faceUri);
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

export async function sendMessage(matchId: string, senderId: string, message: ChatMessage) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const prepared = await prepareChatMessageForBackend(message);
  const mediaPath = prepared.uri ?? prepared.voice?.uri ?? prepared.sticker?.faceUri ?? null;
  const { data, error } = await supabase.from('messages').insert({
    match_id: matchId,
    sender_id: senderId,
    kind: prepared.type,
    body: prepared.text ?? null,
    media_path: mediaPath,
    metadata: { gift: prepared.gift, date: prepared.date, snap: prepared.snap, sticker: prepared.sticker, voice: prepared.voice, location: prepared.location },
  }).select().single();
  if (error) throw error;
  return messageRowToChatMessage(data as MessageRow);
}

export async function sendCurrentUserMessage(matchId: string, message: ChatMessage) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const userId = await requireCurrentUserId();
  return sendMessage(matchId, userId, message);
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
  if (isSupabaseConfigured) await supabase.auth.signOut();
}

export async function reportMember(reportedId: string, reason: string, details?: string) {
  if (!isSupabaseConfigured) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to submit a report.');
  const { data, error } = await supabase.from('reports').insert({ reporter_id:user.id, reported_id:reportedId, reason, details:details??null }).select().single();
  if (error) throw error;
  return data;
}

export async function blockMember(blockedId: string) {
  if (!isSupabaseConfigured) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to block a member.');
  const { error } = await supabase.from('blocks').insert({ blocker_id:user.id, blocked_id:blockedId });
  if (error) throw error;
  return true;
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

export async function saveChatSettings(matchId: string, settings: { nickname?: string; theme?: string }) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const userId = await requireCurrentUserId();
  const { data, error } = await supabase.from('chat_settings').upsert({
    match_id: matchId,
    user_id: userId,
    nickname: settings.nickname ?? null,
    theme: settings.theme ?? 'Ruby Velvet',
    updated_at: new Date().toISOString(),
  }).select().single();
  if (error) throw error;
  return data;
}

export async function createLiveLocationShare(input: {
  matchId: string;
  latitude: number;
  longitude: number;
  accuracyM?: number | null;
  expiresAt: string;
}) {
  ensureBackendConfigured();
  if (!isSupabaseConfigured) return null;
  const userId = await requireCurrentUserId();
  const { data, error } = await supabase.from('live_location_shares').insert({
    match_id: input.matchId,
    sender_id: userId,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy_m: input.accuracyM ?? null,
    expires_at: input.expiresAt,
  }).select().single();
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
