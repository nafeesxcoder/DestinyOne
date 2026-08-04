import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = readFileSync('App.tsx', 'utf8');
const nextProfile = readFileSync('frontend/src/components/profile/ProfileSummary.jsx', 'utf8');
const nextDates = readFileSync('frontend/src/components/dates/DateMarketplace.jsx', 'utf8');

describe('release-critical accessibility safeguards', () => {
  it('keeps screen-reader headings on the five audited primary experiences', () => {
    expect(app).toContain('accessibilityRole="header" style={homeCleanStyles.heroTitle}');
    expect(app).toContain('accessibilityRole="header" style={shared.h2}>Your next step');
    expect(app).toContain('<View accessibilityRole="header" style={{flex:1}}>');
    expect(app).toContain('accessibilityRole="header" style={marketplaceBrandStyles.headerTitle}');
    expect(app).toContain('accessibilityRole="header" style={shared.h2}>Your profile');
  });

  it('labels marketplace search fields and profile progress without changing layout', () => {
    expect(app).toContain('accessibilityLabel="Date Marketplace city"');
    expect(app).toContain('accessibilityLabel="Search Date Marketplace"');
    expect(app).toContain('accessibilityRole="progressbar" accessibilityLabel="Profile completion"');
    expect(nextDates).toContain('aria-label="Search Date Marketplace"');
    expect(nextProfile).toContain('role="progressbar"');
    expect(nextProfile).toContain('aria-valuenow="82"');
  });

  it('expands compact interaction zones and keeps meaningful image descriptions', () => {
    expect((app.match(/hitSlop=\{accessibilityHitSlop\}/g) ?? []).length).toBeGreaterThanOrEqual(25);
    expect(app).toContain('accessibilityLabel={`${match.name} profile photo`}');
    expect(app).toContain('accessibilityLabel={`${displayName} profile photo`}');
  });

  it('does not install a page MutationObserver against a nullable render target', () => {
    expect(app).not.toContain('new MutationObserver');
  });
});
