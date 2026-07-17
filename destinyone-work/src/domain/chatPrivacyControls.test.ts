import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultCoupleChatSettings } from '../storage';

const migration=readFileSync('supabase/migrations/031_chat_privacy_controls.sql','utf8');

describe('chat privacy controls',()=>{
  it('defaults to keeping messages while enabling supported capture alerts',()=>{
    expect(defaultCoupleChatSettings.retentionMode).toBe('keep');
    expect(defaultCoupleChatSettings.screenshotAlerts).toBe(true);
  });
  it('enforces seen retention and authenticated screenshot event recording',()=>{
    expect(migration).toContain('mark_match_messages_seen');
    expect(migration).toContain("retention_mode='after_seen'");
    expect(migration).toContain('record_chat_screenshot');
    expect(migration).toContain('chat_screenshot');
    expect(migration).toContain('rate limit');
  });
  it('does not promise universal web screenshot detection',()=>{
    const app=readFileSync('App.tsx','utf8');
    expect(app).toContain('cannot be detected reliably');
    expect(app).toContain('never show a false');
  });
});
