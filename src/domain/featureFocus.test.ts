import { describe, expect, it } from 'vitest';
import { buildFeatureFocusSnapshot, featureCatalog, primaryNavigation } from './featureFocus';

describe('feature focus',()=>{
  it('keeps the mobile navigation to five stable primary destinations',()=>{
    expect(primaryNavigation.map(item=>item.label)).toEqual(['Matches','Discover','Chat','Dates','Profile']);
  });

  it('keeps every core feature on a primary destination',()=>{
    const snapshot=buildFeatureFocusSnapshot();
    expect(snapshot.coreDestinationCoverage).toBe(snapshot.coreFeatureCount);
    expect(snapshot.mainNavigationExperiments).toHaveLength(0);
  });

  it('keeps delight features behind chat attachments',()=>{
    expect(featureCatalog.filter(item=>item.tier==='delight').every(item=>item.entry==='chat_attachment')).toBe(true);
  });
});
