import { describe, expect, it } from 'vitest';
import { buildFeatureFocusSnapshot, featureCatalog, primaryNavigation } from './featureFocus';

describe('feature focus',()=>{
  it('keeps every key relationship action one tap away',()=>{
    expect(primaryNavigation.map(item=>item.label)).toEqual(['Matches','Discover','Chat','Dates','Gifts','Executive','Profile']);
  });

  it('keeps every core feature on a primary destination',()=>{
    const snapshot=buildFeatureFocusSnapshot();
    expect(snapshot.coreDestinationCoverage).toBe(snapshot.coreFeatureCount);
    expect(snapshot.mainNavigationExperiments).toHaveLength(0);
  });

  it('keeps playful delight features inside chat while gifts stay directly reachable',()=>{
    expect(featureCatalog.find(item=>item.id==='gift_marketplace')?.entry).toBe('gifts');
    expect(featureCatalog.filter(item=>item.tier==='delight').every(item=>item.entry==='chat_attachment')).toBe(true);
  });
});
