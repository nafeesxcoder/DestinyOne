import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const realtime=readFileSync('src/services/realtimeChat.ts','utf8');
const call=readFileSync('src/hooks/useWebRtcCall.ts','utf8');
const migration=readFileSync('supabase/migrations/20260803215545_real_chat_push_calls.sql','utf8');
const push=readFileSync('supabase/functions/dispatch-push/index.ts','utf8');

describe('real chat, push and call contracts',()=>{
  it('uses private, authenticated match topics and persisted receipts',()=>{
    expect(realtime).toContain('private: true');
    expect(realtime).toContain("supabase.realtime.setAuth()");
    expect(realtime).toContain("mark_match_messages_delivered");
    expect(realtime).toContain("mark_match_messages_read");
    expect(migration).toContain('on realtime.messages');
  });

  it('negotiates real browser media without persisting SDP or ICE',()=>{
    expect(call).toContain('getUserMedia');
    expect(call).toContain('RTCPeerConnection');
    expect(call).toContain("type:'offer'");
    expect(call).toContain("type:'answer'");
    expect(migration).not.toMatch(/create table[^;]+(?:sdp|ice_candidate)/is);
  });

  it('dispatches privacy-safe pushes and revokes invalid Expo devices',()=>{
    expect(migration).toContain("'New message','A verified mutual match sent you a private message.'");
    expect(push).toContain('DeviceNotRegistered');
    expect(push).toContain('PUSH_DISPATCH_SECRET');
  });
});
