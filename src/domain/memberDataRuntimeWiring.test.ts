import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = readFileSync('App.tsx', 'utf8');

describe('member data runtime wiring', () => {
  it('does not hydrate or persist preview member state in a server runtime', () => {
    expect(app).toContain('if(memberDataRuntime.allowsLocalHydration)');
    expect(app).toContain('if(!hydrated||!memberDataRuntime.allowsLocalPersistence)return;');
    expect(app).toContain("if(memberDataRuntime.source==='server')");
  });

  it('does not expose preview routes or mock matches outside demo mode', () => {
    expect(app).toContain("backendRuntime.mode!=='demo'");
    expect(app).toContain('memberDataRuntime.allowsMockMatches?null:[]');
  });

  it('shows an honest retry state when server matches fail', () => {
    expect(app).toContain("setMatchLoadState('error')");
    expect(app).toContain('We will never replace unavailable member data with demo profiles.');
    expect(app).toContain('onRetryMatches');
  });

  it('requires server acknowledgement before committing member actions', () => {
    expect(app).toContain('confirmMemberMutation(result');
    expect(app).toContain("memberDataRuntime.source==='preview'||isMutualMatchDecision(result.data)");
    expect(app).toContain("setAppNotice({title:'Interest sent privately'");
    expect(app).toContain("if(!isChatMessage(result.data))");
  });

  it('keeps invented chat, likes, and presence signals in preview only', () => {
    expect(app).toContain("memberDataRuntime.source==='preview'&&<><View style={styles.iceReveal}");
    expect(app).toContain("memberDataRuntime.source==='preview'&&<View style={chatStyles.typingBubble}");
    expect(app).toContain("const preview=memberDataRuntime.source==='preview';return <SafeAreaView");
    expect(app).toContain("memberDataRuntime.source==='preview'?'24':'—'");
    expect(app).toContain("'Private conversation'");
  });

  it('keeps verification, safety and checkout simulations out of server runtimes', () => {
    expect(app).toContain("const recordSafeCheckIn=(id:string)=>{");
    expect(app).toContain("Secure date check-ins are unavailable until the live safety endpoint is connected.");
    expect(app).toContain("const requirePreview=(action:()=>void)=>");
    expect(app).toContain("No verification, consent, or trusted-device result was changed.");
    expect(app).toContain("if(preview)setVerified(true)");
    expect(app).toContain("Your badge appears after approval.");
    expect(app).toContain("No identity document was selected or stored.");
    expect(app).toContain("Secure data export is unavailable until identity verification and the live export endpoint are connected.");
    expect(app).toContain("if(memberDataRuntime.source==='server'){");
  });
});
