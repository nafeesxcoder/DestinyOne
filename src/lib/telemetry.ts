type AnalyticsEvent =
  | { name: 'discovery_signal'; properties: { type: 'view' | 'interested' | 'skip' } }
  | { name: 'gift_sent'; properties: { gift: string; coins: number } }
  | { name: 'physical_gift_requested'; properties: { gift: string; demo: boolean } }
  | { name: 'relationship_path_opened'; properties: { stage: string } }
  | { name: 'date_plan_status_changed'; properties: { from_status: string; to_status: string } }
  | { name: 'private_reflection_saved'; properties: { choice: 'continue' | 'pause' | 'close' } }
  | { name: 'relationship_learning_consent_changed'; properties: { enabled: boolean } }
  | { name: 'date_reminder_changed'; properties: { enabled: boolean } };

/**
 * Privacy-safe analytics boundary. Never pass names, contact details, message
 * contents, precise locations, photos, or profile IDs here. Connect this to a
 * consent-aware production analytics provider during launch configuration.
 */
export function track<T extends AnalyticsEvent['name']>(
  name: T,
  properties: Extract<AnalyticsEvent, { name: T }>['properties'],
) {
  if (__DEV__) console.info(`[analytics] ${name}`, properties);
}

/** Connect this adapter to Sentry (or equivalent) after production DSN setup. */
export function captureException(error: unknown, context?: string) {
  if (__DEV__) console.error(`[crash]${context ? ` ${context}` : ''}`, error);
}
