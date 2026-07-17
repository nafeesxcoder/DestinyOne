export const primaryNavigation=[
  {label:'Matches',target:'home',purpose:'qualified_introductions'},
  {label:'Discover',target:'explore',purpose:'supporting_paths'},
  {label:'Chat',target:'chat',purpose:'meaningful_conversation'},
  {label:'Dates',target:'events',purpose:'accepted_real_dates'},
  {label:'Profile',target:'profile',purpose:'trust_and_control'},
] as const;

export type FeatureTier='core'|'supporting'|'delight'|'operations';

export type FeatureSurface='primary_navigation'|'home'|'explore'|'chat_toolbar'|'chat_attachment_primary'|'chat_attachment_more'|'profile_operations';

export const relationshipJourneySteps=[
  {id:'introduce',label:'Meet',icon:'heart-outline',target:'home'},
  {id:'understand',label:'Align',icon:'git-compare-outline',target:'home'},
  {id:'connect',label:'Talk',icon:'chatbubble-outline',target:'chat'},
  {id:'meet_safely',label:'Plan',icon:'calendar-outline',target:'events'},
] as const;

export const chatPrimaryAttachments=[
  {id:'date_market',label:'Date',icon:'calendar',color:'#A75A1D'},
  {id:'camera',label:'Camera',icon:'camera',color:'#E5092F'},
  {id:'gallery',label:'Gallery',icon:'images',color:'#A71D35'},
  {id:'location',label:'Location',icon:'location',color:'#D4AF37'},
  {id:'document',label:'Document',icon:'document-text',color:'#7A1FE0'},
  {id:'more',label:'More',icon:'ellipsis-horizontal',color:'#7A1FE0'},
] as const;

export const chatMoreAttachments=[
  {id:'contact',label:'Contact',icon:'person',color:'#399A70'},
  {id:'poll',label:'Poll',icon:'stats-chart',color:'#D4AF37'},
  {id:'gif',label:'GIF',icon:'happy',color:'#B9293F'},
  {id:'gift',label:'Gift',icon:'gift',color:'#D4AF37'},
  {id:'games',label:'Games',icon:'game-controller',color:'#7A1FE0'},
  {id:'snap',label:'Snap',icon:'aperture',color:'#B9293F'},
  {id:'face',label:'Face',icon:'person-circle',color:'#89162C'},
  {id:'spark',label:'Spark',icon:'sparkles',color:'#D4AF37'},
  {id:'disappearing',label:'24h',icon:'timer',color:'#D4AF37'},
  {id:'back',label:'Back',icon:'arrow-back',color:'#7A1FE0'},
] as const;

export const featureSurfaceBudgets:Record<FeatureSurface,number>={
  primary_navigation:5,
  home:3,
  explore:7,
  chat_toolbar:5,
  chat_attachment_primary:6,
  chat_attachment_more:10,
  profile_operations:8,
};

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
    primaryAttachmentCount:chatPrimaryAttachments.length,
    primaryAttachmentOverflow:Math.max(0,chatPrimaryAttachments.length-featureSurfaceBudgets.chat_attachment_primary),
    duplicatePrimaryAttachmentIds:chatPrimaryAttachments.filter((item,index,items)=>items.findIndex(candidate=>candidate.id===item.id)!==index).map(item=>item.id),
    journeyStepCount:relationshipJourneySteps.length,
  };
}
