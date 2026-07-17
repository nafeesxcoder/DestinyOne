import { describe, expect, it } from 'vitest';
import { buildFeatureFocusSnapshot, chatMoreAttachments, chatPrimaryAttachments, featureCatalog, featureSurfaceBudgets, primaryNavigation, relationshipJourneySteps } from './featureFocus';

describe('feature focus',()=>{
  it('keeps date planning visible in the stable primary navigation',()=>{
    expect(primaryNavigation.map(item=>item.label)).toEqual(['Matches','Discover','Chat','Dates','Executive','Profile']);
  });

  it('keeps every core feature on a primary destination',()=>{
    const snapshot=buildFeatureFocusSnapshot();
    expect(snapshot.coreDestinationCoverage).toBe(snapshot.coreFeatureCount);
    expect(snapshot.mainNavigationExperiments).toHaveLength(0);
  });

  it('keeps delight features behind chat attachments',()=>{
    expect(featureCatalog.filter(item=>item.tier==='delight').every(item=>item.entry==='chat_attachment')).toBe(true);
  });

  it('keeps the first attachment page focused on six high-frequency actions',()=>{
    const snapshot=buildFeatureFocusSnapshot();
    expect(chatPrimaryAttachments.map(item=>item.id)).toEqual(['date_market','camera','gallery','location','document','more']);
    expect(snapshot.primaryAttachmentCount).toBe(featureSurfaceBudgets.chat_attachment_primary);
    expect(snapshot.primaryAttachmentOverflow).toBe(0);
    expect(snapshot.duplicatePrimaryAttachmentIds).toHaveLength(0);
  });

  it('keeps delight and secondary share tools on the second attachment page',()=>{
    const secondaryIds=chatMoreAttachments.map(item=>item.id);
    expect(['gif','gift','games','snap','face','contact','poll']).toEqual(expect.arrayContaining(secondaryIds.filter(id=>['gif','gift','games','snap','face','contact','poll'].includes(id))));
    expect(chatMoreAttachments.length).toBeLessThanOrEqual(featureSurfaceBudgets.chat_attachment_more);
  });

  it('expresses one four-step relationship journey across primary destinations',()=>{
    expect(relationshipJourneySteps.map(step=>step.label)).toEqual(['Meet','Align','Talk','Plan']);
    expect(new Set(relationshipJourneySteps.map(step=>step.id)).size).toBe(relationshipJourneySteps.length);
  });
});
