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

  it('anchors checkout sheets inside a full-screen modal root', () => {
    expect(app).toContain('<View style={pricingStyles.checkoutModalRoot}><Pressable style={chatStyles.modalBackdrop}');
    expect(app).toContain('checkoutModalRoot:{flex:1}');
    expect(app).toContain("animationType={Platform.OS==='web'?'fade':'slide'}");
  });
});
