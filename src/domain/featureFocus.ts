export const primaryNavigation=[
  {label:'Matches',target:'home',purpose:'qualified_introductions'},
  {label:'Discover',target:'explore',purpose:'supporting_paths'},
  {label:'Chat',target:'chat',purpose:'meaningful_conversation'},
  {label:'Dates',target:'events',purpose:'accepted_real_dates'},
  {label:'Profile',target:'profile',purpose:'trust_and_control'},
] as const;

export type FeatureTier='core'|'supporting'|'delight'|'operations';

export const featureCatalog=[
  {id:'daily_matches',tier:'core',entry:'home'},
  {id:'chat_relationship_path',tier:'core',entry:'chat'},
  {id:'date_marketplace',tier:'core',entry:'events'},
  {id:'verification_profile',tier:'core',entry:'profile'},
  {id:'likes',tier:'supporting',entry:'explore'},
  {id:'filters',tier:'supporting',entry:'explore'},
  {id:'relationship_coach',tier:'supporting',entry:'explore'},
  {id:'trusted_circle',tier:'supporting',entry:'explore'},
  {id:'executive_circle',tier:'supporting',entry:'explore'},
  {id:'gifts_games_gifs',tier:'delight',entry:'chat_attachment'},
  {id:'admin_readiness',tier:'operations',entry:'profile'},
] as const;

export function buildFeatureFocusSnapshot(){
  const primaryTargets=new Set(primaryNavigation.map(item=>item.target));
  const core=featureCatalog.filter(item=>item.tier==='core');
  const mainNavigationExperiments=primaryNavigation.filter(item=>!['qualified_introductions','supporting_paths','meaningful_conversation','accepted_real_dates','trust_and_control'].includes(item.purpose));
  return {
    primaryTabCount:primaryNavigation.length,
    mainNavigationExperiments,
    coreDestinationCoverage:core.filter(item=>primaryTargets.has(item.entry as typeof primaryNavigation[number]['target'])).length,
    coreFeatureCount:core.length,
    delightFeatureCount:featureCatalog.filter(item=>item.tier==='delight').length,
  };
}
