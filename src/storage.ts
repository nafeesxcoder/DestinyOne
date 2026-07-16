import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@destinyone/app_state/v1';
const LEGACY_STORAGE_KEYS = ['@mi_amore/app_state/v1'];

export type ChatMessage = {
  id: string;
  type: 'text' | 'image' | 'gif' | 'gift' | 'date' | 'snap' | 'sticker' | 'voice' | 'location';
  text?: string;
  uri?: string;
  gift?: {
    name: string;
    emoji: string;
    coins?: number;
    priceCents?: number;
    physical?: boolean;
    orderId?: string;
    deliveryStatus?: 'requested'|'recipient_pending'|'recipient_accepted'|'payment_authorized'|'merchant_preparing'|'courier_assigned'|'picked_up'|'delivered'|'cancelled'|'failed';
    etaLabel?: string;
    etaConfidence?: string;
    provider?: string;
    quoteId?: string;
    serviceLevel?: string;
    providerRecommendation?: string;
    paymentPolicy?: string;
    cancellationPolicy?: string;
    supportPolicy?: string;
    recipientPrivacy?: string;
    acceptanceWindowMinutes?: number;
    acceptanceExpiresAt?: string;
    trackingUrl?: string;
    totalCents?: number;
    steps?: Array<{ key: string; label: string; body: string; status: 'done'|'active'|'pending'; eta?: string }>;
  };
  snap?: { filter: string; sticker?: string; expiresAt: number; viewOnce: boolean };
  sticker?: { faceUri: string; emoji: string; label: string; filter?: string };
  voice?: { uri: string; durationMs: number };
  location?: { latitude: number; longitude: number; label: string; live: boolean; expiresAt?: number; accuracy?: number };
  date?: { venue: string; category: string; area: string; time: string; safetyCheckIn: boolean; packageTitle?: string; packageTier?: string };
  createdAt: number;
  status: 'sent' | 'delivered' | 'read';
};

export type MatchFilters = {
  lookingFor: 'Women' | 'Men' | 'Everyone';
  minAge: number;
  maxAge: number;
  cities: string[];
  intents: string[];
  mustHaveVibes: string[];
  familyPriority: 'any' | 'high' | 'balanced';
  children: 'any' | 'wants' | 'open' | 'does_not_want';
  marriageTimeline: 'any' | '1_2_years' | '2_3_years';
  relocation: 'any' | 'open' | 'same_city';
  distancePreference: 'anywhere' | 'selected_cities' | 'same_state' | 'open_to_relocate';
};

export type RoseLedger = {
  dayKey: string;
  freeUsed: boolean;
  paidCredits: number;
  sent: Array<{ id: string; matchId: string; note: string; paid: boolean; createdAt: number }>;
};

export type CoupleChatSettings = {
  nickname: string;
  theme: string;
};

export type ProfileDraft = {
  firstName: string;
  age: string;
  city: string;
  height: string;
  profession: string;
  religion: string;
  community: string;
};

export type DiscoverySignal = {
  id: string;
  type: 'view' | 'interested' | 'skip';
  matchId: string;
  createdAt: number;
};

export type LocalReport = {
  id: string;
  matchId: string;
  reason: string;
  details?: string;
  createdAt: number;
};

export type PersistedAppState = {
  onboardingComplete: boolean;
  authDestination: string;
  verified: boolean;
  profileDraft: ProfileDraft;
  vibes: string[];
  intent: string;
  alignment: Record<string, string>;
  chats: Record<string, ChatMessage[]>;
  coinBalance: number;
  photos: string[];
  selfieUri: string;
  voiceIntroUri: string;
  vouches: string[];
  discoverySignals: DiscoverySignal[];
  smartDiscovery: boolean;
  crossedPaths: boolean;
  blockedIds: string[];
  reports: LocalReport[];
  safeCheckIns: string[];
  matchFilters: MatchFilters;
  roseLedger: RoseLedger;
  lastSeenVisible: boolean;
  chatSettings: Record<string, CoupleChatSettings>;
};

export const defaultMatchFilters: MatchFilters = {
  lookingFor: 'Women',
  minAge: 25,
  maxAge: 35,
  cities: [],
  intents: [],
  mustHaveVibes: [],
  familyPriority: 'any',
  children: 'any',
  marriageTimeline: 'any',
  relocation: 'any',
  distancePreference: 'anywhere',
};

export const initialRoseLedger: RoseLedger = {
  dayKey: '',
  freeUsed: false,
  paidCredits: 0,
  sent: [],
};

export const initialProfileDraft: ProfileDraft = {
  firstName: 'Arjun',
  age: '30',
  city: 'New York, NY',
  height: '5′ 10″',
  profession: 'Strategy Consultant',
  religion: '',
  community: '',
};

export const initialPersistedState: PersistedAppState = {
  onboardingComplete: false,
  authDestination: '',
  verified: false,
  profileDraft: initialProfileDraft,
  vibes: [],
  intent: 'Long-term, leading to Marriage',
  alignment: {},
  chats: {},
  coinBalance: 500,
  photos: [],
  selfieUri: '',
  voiceIntroUri: '',
  vouches: [],
  discoverySignals: [],
  smartDiscovery: true,
  crossedPaths: false,
  blockedIds: [],
  reports: [],
  safeCheckIns: [],
  matchFilters: defaultMatchFilters,
  roseLedger: initialRoseLedger,
  lastSeenVisible: true,
  chatSettings: {},
};

export async function loadAppState(): Promise<PersistedAppState> {
  try {
    let raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const legacyRaw = await AsyncStorage.getItem(legacyKey);
        if (legacyRaw) {
          raw = legacyRaw;
          await AsyncStorage.setItem(STORAGE_KEY, legacyRaw);
          break;
        }
      }
    }
    if (!raw) return initialPersistedState;
    const parsed = JSON.parse(raw);
    const chats = Object.fromEntries(Object.entries(parsed.chats ?? {}).map(([matchId,messages])=>[
      matchId,
      (messages as Array<string | ChatMessage>).map((message,index)=>typeof message==='string'?{
        id:`legacy-${matchId}-${index}`,
        type:'text' as const,
        text:message,
        createdAt:Date.now()+index,
        status:'read' as const,
      }:message),
    ]));
    return {
      ...initialPersistedState,
      ...parsed,
      chats,
      profileDraft: { ...initialProfileDraft, ...(parsed.profileDraft ?? {}) },
      matchFilters: { ...defaultMatchFilters, ...(parsed.matchFilters ?? {}) },
      roseLedger: { ...initialRoseLedger, ...(parsed.roseLedger ?? {}) },
    };
  } catch {
    return initialPersistedState;
  }
}

export async function saveAppState(state: PersistedAppState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function clearAppState() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  await Promise.all(LEGACY_STORAGE_KEYS.map((key) => AsyncStorage.removeItem(key)));
}
