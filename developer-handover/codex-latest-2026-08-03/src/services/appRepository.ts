import {
  buildPrivacySafeEvent,
  getLaunchReadinessSnapshot,
  productionDataModules,
  type LaunchReadinessSnapshot,
  type PrivacySafeEvent,
} from '../domain/appModel';

export type RepositoryMode = 'demo' | 'supabase';

export type MemberNotification = {
  id: string;
  memberId: string;
  type: 'match' | 'profile_view' | 'rose' | 'gift' | 'date' | 'support' | 'safety' | 'trust';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type TrustEvidenceRecord = {
  id: string;
  memberId: string;
  kind: 'selfie_liveness' | 'government_id' | 'business_proof' | 'friend_vouch' | 'voice_intro';
  status: 'prepared' | 'submitted' | 'approved' | 'rejected';
  publicBadge: 'none' | 'verified_member' | 'id_checked' | 'executive_ready' | 'trusted_circle' | 'voice_intro';
  privateNote: string;
  createdAt: string;
  updatedAt: string;
};

export type SafetyCaseRecord = {
  id: string;
  reporterId: string;
  targetId: string;
  reason: 'harassment' | 'fake_profile' | 'money_request' | 'unsafe_meeting' | 'other';
  status: 'open' | 'triaged' | 'resolved';
  priority: 'normal' | 'high' | 'urgent';
  createdAt: string;
};

export type AppRepositoryHealth = {
  mode: RepositoryMode;
  readyForBackendLink: boolean;
  readiness: LaunchReadinessSnapshot;
  counts: {
    events: number;
    notifications: number;
    trustEvidence: number;
    safetyCases: number;
  };
};

export type AppRepository = {
  mode: RepositoryMode;
  getHealth(): AppRepositoryHealth;
  recordEvent(event: Omit<PrivacySafeEvent, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): PrivacySafeEvent;
  createNotification(input: Omit<MemberNotification, 'id' | 'read' | 'createdAt'>): MemberNotification;
  listNotifications(memberId: string): MemberNotification[];
  markNotificationRead(notificationId: string): boolean;
  submitTrustEvidence(input: Omit<TrustEvidenceRecord, 'id' | 'createdAt' | 'updatedAt'>): TrustEvidenceRecord;
  submitSafetyCase(input: Omit<SafetyCaseRecord, 'id' | 'status' | 'createdAt'>): SafetyCaseRecord;
};

type Clock = () => Date;

function createId(prefix: string, now: Date, index: number) {
  return `${prefix}-${now.getTime()}-${index}`;
}

export function createDemoAppRepository(clock: Clock = () => new Date()): AppRepository {
  const events: PrivacySafeEvent[] = [];
  const notifications: MemberNotification[] = [];
  const trustEvidence: TrustEvidenceRecord[] = [];
  const safetyCases: SafetyCaseRecord[] = [];

  const nextId = (prefix: string) => createId(prefix, clock(), events.length + notifications.length + trustEvidence.length + safetyCases.length + 1);

  return {
    mode: 'demo',

    getHealth() {
      return {
        mode: 'demo',
        readyForBackendLink: true,
        readiness: getLaunchReadinessSnapshot(productionDataModules),
        counts: {
          events: events.length,
          notifications: notifications.length,
          trustEvidence: trustEvidence.length,
          safetyCases: safetyCases.length,
        },
      };
    },

    recordEvent(input) {
      const createdAt = input.createdAt ?? clock().toISOString();
      const event = buildPrivacySafeEvent({
        id: input.id ?? nextId('event'),
        memberId: input.memberId,
        type: input.type,
        createdAt,
        metadata: input.metadata,
      });
      events.push(event);
      return event;
    },

    createNotification(input) {
      const notification: MemberNotification = {
        ...input,
        id: nextId('notification'),
        read: false,
        createdAt: clock().toISOString(),
      };
      notifications.unshift(notification);
      return notification;
    },

    listNotifications(memberId) {
      return notifications.filter((notification) => notification.memberId === memberId);
    },

    markNotificationRead(notificationId) {
      const found = notifications.find((notification) => notification.id === notificationId);
      if (!found) return false;
      found.read = true;
      return true;
    },

    submitTrustEvidence(input) {
      const now = clock().toISOString();
      const record: TrustEvidenceRecord = {
        ...input,
        id: nextId('trust'),
        createdAt: now,
        updatedAt: now,
      };
      trustEvidence.unshift(record);
      this.recordEvent({
        memberId: input.memberId,
        type: 'trust_update',
        metadata: { kind: input.kind, status: input.status, privateNote: input.privateNote },
      });
      return record;
    },

    submitSafetyCase(input) {
      const safetyCase: SafetyCaseRecord = {
        ...input,
        id: nextId('safety'),
        status: 'open',
        createdAt: clock().toISOString(),
      };
      safetyCases.unshift(safetyCase);
      this.recordEvent({
        memberId: input.reporterId,
        type: 'safety_report',
        metadata: { targetId: input.targetId, reason: input.reason, priority: input.priority },
      });
      return safetyCase;
    },
  };
}

export const demoAppRepository = createDemoAppRepository();
