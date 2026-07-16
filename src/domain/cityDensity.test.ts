import { describe, expect, it } from 'vitest';
import { buildCityDensitySnapshot, cityDensityThresholds, resolveLaunchMarket, type CityLiquidityMeasurement } from './cityDensity';

const healthyToronto: CityLiquidityMeasurement = {
  city: 'Toronto',
  verifiedActiveMembers: 280,
  cohortFloorPercent: 24,
  medianEligibleCandidates: 22,
  qualifiedIntroductionsPerActive: 3.8,
  replyRatePercent: 54,
  meaningfulConversationRatePercent: 31,
  acceptedDateRatePercent: 11,
  eightWeekRetentionPercent: 41,
  safetyIncidentsPer100Dates: 0.8,
  consecutiveHealthyWeeks: 8,
  waitlistMembers: 1160,
  activeAmbassadors: 11,
  monthlyEventSeats: 120,
};

describe('city density operations', () => {
  it('never treats source-only modeled data as live density', () => {
    const snapshot = buildCityDensitySnapshot({ liveMetricsConnected: false, measurements: [healthyToronto] });

    expect(snapshot.status).toBe('Source model only');
    expect(snapshot.score).toBe(0);
    expect(snapshot.readyMarkets).toBe(0);
    expect(snapshot.markets[3]?.status).toBe('Measurement missing');
  });

  it('requires liquidity, outcomes, safety, retention, and eight healthy weeks', () => {
    const snapshot = buildCityDensitySnapshot({ liveMetricsConnected: true, measurements: [healthyToronto] });
    const toronto = snapshot.markets.find((market) => market.city === 'Toronto');

    expect(toronto?.status).toBe('Ready to expand');
    expect(toronto?.gates).toHaveLength(7);
    expect(toronto?.gates.every((gate) => gate.ready)).toBe(true);
  });

  it('keeps an unsafe or shallow market inside a controlled pilot', () => {
    const snapshot = buildCityDensitySnapshot({
      liveMetricsConnected: true,
      measurements: [{ ...healthyToronto, safetyIncidentsPer100Dates: 2.4, consecutiveHealthyWeeks: 3 }],
    });
    const toronto = snapshot.markets.find((market) => market.city === 'Toronto');

    expect(toronto?.status).toBe('Controlled pilot');
    expect(toronto?.gates.find((gate) => gate.id === 'safety')?.ready).toBe(false);
    expect(toronto?.gates.find((gate) => gate.id === 'durability')?.ready).toBe(false);
  });

  it('resolves metro aliases without collecting precise coordinates', () => {
    expect(resolveLaunchMarket('Mississauga, ON')?.name).toBe('Toronto');
    expect(resolveLaunchMarket('Jersey City, NJ')?.name).toBe('NYC');
    expect(resolveLaunchMarket('Vancouver, BC')).toBeUndefined();
    expect(cityDensityThresholds.medianEligibleCandidates).toBeGreaterThan(10);
  });
});
