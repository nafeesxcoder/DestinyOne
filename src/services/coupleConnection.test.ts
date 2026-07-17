import { describe, expect, it } from 'vitest';
import { parseCoupleConnectionHub } from '../domain/coupleConnection';

const partner = {
  member_id: 'member-2',
  display_name: 'Maya',
  city: 'Toronto, ON',
  profession: 'Product Designer',
  verified: true,
};

describe('couple connection response parsing', () => {
  it('parses a connected two-person hub', () => {
    expect(parseCoupleConnectionHub({
      experience_mode: 'couple',
      connection: { connection_id: 'space-1', partner_member_id: 'member-2', partner_display_name: 'Maya' },
      incoming_requests: [],
      outgoing_requests: [],
    })).toEqual({
      experienceMode: 'couple',
      connection: { connectionId: 'space-1', partnerMemberId: 'member-2', partnerDisplayName: 'Maya' },
      incomingRequests: [],
      outgoingRequests: [],
    });
  });

  it('parses incoming and outgoing consent requests', () => {
    const request = {
      request_id: 'request-1', member: partner, status: 'pending',
      created_at: '2026-07-16T10:00:00.000Z', expires_at: '2026-07-23T10:00:00.000Z',
    };
    const hub = parseCoupleConnectionHub({ experience_mode: 'couple', connection: null, incoming_requests: [request], outgoing_requests: [request] });
    expect(hub.incomingRequests[0]).toMatchObject({ requestId: 'request-1', member: { displayName: 'Maya', verified: true } });
    expect(hub.outgoingRequests).toHaveLength(1);
  });

  it('rejects malformed partner data instead of inventing a profile', () => {
    expect(() => parseCoupleConnectionHub({
      connection: null,
      experience_mode: 'couple',
      incoming_requests: [{ request_id: 'request-1', member: { member_id: 'member-2' }, status: 'pending', created_at: 'now', expires_at: 'later' }],
      outgoing_requests: [],
    })).toThrow('partner connection response was incomplete');
  });
});
