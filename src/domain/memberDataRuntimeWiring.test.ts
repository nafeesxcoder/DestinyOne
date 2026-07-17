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
});
