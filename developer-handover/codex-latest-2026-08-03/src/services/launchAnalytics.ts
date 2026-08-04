export const launchAnalyticsEvents = [
  'app_session_started','screen_viewed','onboarding_started','membership_viewed',
  'checkout_started','checkout_store_opened','checkout_verification_started','checkout_completed','checkout_failed',
  'restore_started','restore_completed','restore_failed','discovery_signal','gift_sent','physical_gift_requested',
  'relationship_path_opened','date_plan_status_changed','private_reflection_saved',
  'relationship_learning_consent_changed','date_reminder_changed',
] as const;
export type LaunchAnalyticsEventName = (typeof launchAnalyticsEvents)[number];

type SafeValue = string | number | boolean;
type QueuedEvent = { id: string; name: LaunchAnalyticsEventName; properties: Record<string, SafeValue>; occurredAt: string };
export type LaunchAnalyticsRuntime = {
  platform?: 'ios' | 'android' | 'web';
  appVersion?: string;
  buildVariant?: 'development' | 'pilot' | 'production' | 'preview';
};

const queueKey = 'destinyone:launch-analytics-queue:v1';
const allowedKeys = new Set(['screen_key','action_key','item_key','status_key','source_key','type','stage','from_status','to_status','choice','enabled','demo','count_bucket','value_bucket','platform','app_version','build_variant','network_state','duration_bucket','error_code']);
const aliases: Record<string, string> = { gift: 'item_key', coins: 'value_bucket' };
const forbiddenFragments = ['name','email','phone','message','photo','latitude','longitude','address','profile','match','otp','token','transaction'];
let consent = false;
let flushing = false;
let sessionId: string | null = null;
let runtime: Required<LaunchAnalyticsRuntime> = {
  platform: typeof window === 'undefined' ? 'web' : 'web',
  appVersion: '1.0.0',
  buildVariant: process.env.EXPO_PUBLIC_APP_ENV === 'production' ? 'production' : 'development',
};
const testRuntime = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

async function storage() {
  return (await import('@react-native-async-storage/async-storage')).default;
}

async function analyticsBackend() {
  return import('../lib/supabase');
}

function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function safeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'unknown';
}

export function sanitizeLaunchAnalyticsProperties(properties: Record<string, unknown>) {
  const result: Record<string, SafeValue> = {};
  for (const [rawKey, rawValue] of Object.entries(properties)) {
    const key = aliases[rawKey] ?? rawKey;
    if (!allowedKeys.has(key) || forbiddenFragments.some(fragment => key.toLowerCase().includes(fragment))) continue;
    if (!['string','number','boolean'].includes(typeof rawValue)) continue;
    if (typeof rawValue === 'string') result[key] = ['item_key','screen_key','action_key','status_key','source_key','error_code','type','stage','from_status','to_status','choice','platform','build_variant','network_state','duration_bucket'].includes(key) ? safeSlug(rawValue) : rawValue.slice(0, 80);
    else if (typeof rawValue === 'number') result[key] = key==='value_bucket' ? String(Math.max(0,Math.round(rawValue))) : Number.isFinite(rawValue) ? rawValue : 0;
    else if (typeof rawValue === 'boolean') result[key] = rawValue;
  }
  return result;
}

async function loadQueue() {
  try {
    const AsyncStorage = await storage();
    const parsed = JSON.parse(await AsyncStorage.getItem(queueKey) || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => item && launchAnalyticsEvents.includes(item.name) && typeof item.id === 'string').slice(-100) as QueuedEvent[] : [];
  } catch { return []; }
}

async function saveQueue(queue: QueuedEvent[]) {
  const AsyncStorage = await storage();
  if (!queue.length) await AsyncStorage.removeItem(queueKey);
  else await AsyncStorage.setItem(queueKey, JSON.stringify(queue.slice(-100)));
}

async function currentSessionId() {
  if (sessionId) return sessionId;
  sessionId = uuid();
  return sessionId;
}

async function ensureSession() {
  if (!consent) return null;
  const { isSupabaseConfigured, supabase } = await analyticsBackend();
  if (!isSupabaseConfigured) return null;
  const id = await currentSessionId();
  const { data, error } = await supabase.rpc('start_launch_analytics_session', {
    p_session_id: id,
    p_platform: runtime.platform,
    p_app_version: runtime.appVersion,
    p_build_variant: runtime.buildVariant,
  });
  if (error || data !== true) return null;
  return id;
}

export async function flushLaunchAnalytics() {
  if (flushing || !consent) return;
  flushing = true;
  try {
    const activeSession = await ensureSession();
    if (!activeSession) return;
    const { supabase } = await analyticsBackend();
    const queue = await loadQueue();
    let delivered = 0;
    for (const event of queue) {
      const { data, error } = await supabase.rpc('record_launch_analytics_event', {
        p_event_id: event.id,
        p_session_id: activeSession,
        p_event_name: event.name,
        p_properties: event.properties,
        p_occurred_at: event.occurredAt,
      });
      if (error || data !== true) break;
      delivered += 1;
    }
    if (delivered) await saveQueue(queue.slice(delivered));
  } catch {
    // Offline analytics is intentionally silent and retryable. It must never
    // interrupt sign-in, matching, chat, safety, billing or date planning.
  } finally { flushing = false; }
}

export function configureLaunchAnalyticsConsent(enabled: boolean, context: LaunchAnalyticsRuntime = {}) {
  runtime = { ...runtime, ...context };
  consent = enabled;
  if (testRuntime) return;
  if (!enabled) {
    sessionId = null;
    void storage().then(AsyncStorage => AsyncStorage.removeItem(queueKey));
    return;
  }
  void (async () => {
    const queue = await loadQueue();
    if (!queue.some(event => event.name === 'app_session_started')) {
      queue.push({ id: uuid(), name: 'app_session_started', properties: sanitizeLaunchAnalyticsProperties({ platform: runtime.platform }), occurredAt: new Date().toISOString() });
      await saveQueue(queue);
    }
    await flushLaunchAnalytics();
  })();
}

export function enqueueLaunchAnalytics(name: LaunchAnalyticsEventName, properties: Record<string, unknown>) {
  if (!consent) return false;
  if (testRuntime) return true;
  void (async () => {
    const queue = await loadQueue();
    queue.push({ id: uuid(), name, properties: sanitizeLaunchAnalyticsProperties(properties), occurredAt: new Date().toISOString() });
    await saveQueue(queue);
    await flushLaunchAnalytics();
  })();
  return true;
}
