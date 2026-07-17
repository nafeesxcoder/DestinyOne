import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = readFileSync('App.tsx', 'utf8');

describe('monetization readiness wiring', () => {
  it('does not confuse Stripe real-world payments with Apple or Google store billing', () => {
    expect(app).toContain("billingMode:'preview'");
    expect(app).toContain('stripeReservationReady:paymentsConfigured');
    expect(app).not.toContain("billingMode:paymentsConfigured?'store':'preview'");
  });

  it('keeps production paid feature gates and billing lock incomplete until provider integration', () => {
    expect(app).toContain('featureLimitsReady:false');
    expect(app).toContain('productionBillingLocked:false');
    expect(app).toContain("if(appEnvironment==='production')");
    expect(app).toContain('No charge or entitlement was created.');
  });
});
