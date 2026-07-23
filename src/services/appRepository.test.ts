import { describe, expect, it } from 'vitest';
import { buildPrivacySafeEvent, getLaunchReadinessSnapshot, productionDataModules } from '../domain/appModel';
import { createDemoAppRepository } from './appRepository';

describe('app production data model', () => {
  it('keeps every core app module backend-ready before API keys are linked', () => {
    const snapshot = getLaunchReadinessSnapshot(productionDataModules);
    expect(snapshot.totalModules).toBeGreaterThanOrEqual(15);
    expect(snapshot.backendReadyModules).toBe(snapshot.totalModules);
    expect(snapshot.percentReady).toBe(100);
    expect(snapshot.providerModules).toBeGreaterThan(0);
    expect(snapshot.adminReviewModules).toBeGreaterThan(0);
  });

  it('redacts sensitive event metadata before analytics or logs', () => {
    const event = buildPrivacySafeEvent({
      id: 'event-1',
      memberId: 'member-1',
      type: 'profile_view',
      createdAt: '2026-07-12T12:00:00.000Z',
      metadata: {
        viewedId: 'member-2',
        email: 'test@example.com',
        phoneNumber: '+15555555555',
        latitude: 37.78,
        longitude: -122.41,
        token: 'secret',
        durationSeconds: 5,
        nested: { unsafe: true },
      },
    });

    expect(event.metadata.viewedId).toBe('member-2');
    expect(event.metadata.durationSeconds).toBe(5);
    expect(event.metadata.email).toBe('[redacted]');
    expect(event.metadata.phoneNumber).toBe('[redacted]');
    expect(event.metadata.latitude).toBe('[redacted]');
    expect(event.metadata.longitude).toBe('[redacted]');
    expect(event.metadata.token).toBe('[redacted]');
    expect(event.metadata.nested).toBe('[object]');
  });
});

describe('demo app repository', () => {
  it('stores notifications, trust evidence and safety cases with production-shaped records', () => {
    const fixedDate = new Date('2026-07-12T12:00:00.000Z');
    const repository = createDemoAppRepository(() => fixedDate);

    const notification = repository.createNotification({
      memberId: 'member-1',
      type: 'rose',
      title: 'A rose arrived',
      body: 'Someone sent a thoughtful rose.',
    });
    const trust = repository.submitTrustEvidence({
      memberId: 'member-1',
      kind: 'selfie_liveness',
      status: 'submitted',
      publicBadge: 'verified_member',
      privateNote: 'Provider packet prepared.',
    });
    const safetyCase = repository.submitSafetyCase({
      reporterId: 'member-1',
      targetId: 'member-2',
      reason: 'harassment',
      priority: 'high',
    });

    expect(repository.listNotifications('member-1')).toEqual([notification]);
    expect(repository.markNotificationRead(notification.id)).toBe(true);
    expect(repository.listNotifications('member-1')[0]?.read).toBe(true);
    expect(trust.publicBadge).toBe('verified_member');
    expect(safetyCase.status).toBe('open');
    expect(repository.getHealth().counts).toEqual({
      events: 2,
      notifications: 1,
      trustEvidence: 1,
      safetyCases: 1,
    });
  });
});
