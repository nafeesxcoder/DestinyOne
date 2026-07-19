import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageStyle, KeyboardAvoidingView, Linking, Modal, PanResponder, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFonts as usePoppins, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { useFonts as useSatisfy, Satisfy_400Regular } from '@expo-google-fonts/satisfy';
import { Brand, Button, Chip, Field, SectionTitle, StepBar, shared } from './src/components';
import { Match, matches, profileCities, religions, vibes } from './src/data';
import { colors, radius } from './src/theme';
import { ChatMessage, CoupleChatSettings, DatePlanStatus, DiscoverySignal, LocalReport, MatchFilters, ProfileDraft, RelationshipReflectionChoice, RelationshipReflectionRecord, RelationshipReminderRecord, RoseLedger, clearAppState, defaultCoupleChatSettings, defaultMatchFilters, initialPersistedState, loadAppState, saveAppState } from './src/storage';
import * as ImagePicker from 'expo-image-picker';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as Location from 'expo-location';
import { allowsPreviewAuthBypass, allowsPreviewOtpFallback, backendMode, beginAuthentication, fetchDailyMatches, fetchMatchingPoolStatus, loadCurrentMemberBootstrap, requestAccountDeletion, signOut, submitModerationAppeal, submitSupportTicket, verifyAuthentication, type MatchingPoolStatus, type SupportTopic } from './src/services/backend';
import { matchReasons, rankMatches } from './src/domain/matching';
import { canSendGift, spendCoins } from './src/domain/commerce';
import { isEligibleMemberAge, isValidEmail, isValidPassword, isValidPhone } from './src/domain/validation';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { configureAnalyticsConsent, track } from './src/lib/telemetry';
import { appEnvironment, backendRuntime, isSupabaseConfigured, requiresRealBackend, supabase } from './src/lib/supabase';
import { buildDateReservationSteps, createDateReservationIntent, dateReservationMode, dateReservationStatusCopy, estimateDateReservationQuote, formatPaymentMoney, paymentsConfigured, stripePublishableKey, type DateReservationQuote, type DateReservationStatus } from './src/services/payments';
import { ApplePayReservationButton, StripePaymentProvider, checkApplePaySupport, confirmApplePayReservation } from './src/payments/stripe';
import { buildGiftFulfillmentPlan, createPhysicalGiftOrder, digitalGiftWalletMode, estimateGiftOrderQuote, formatGiftMoney, giftOrderSummary, giftOrderingConfigured, physicalGiftOrderingMode, vouchRewardsMode, type GiftFulfillmentStatus, type GiftOrderQuote } from './src/services/gifts';
import { fetchPersistedChatMessages, fetchPersistedRelationshipJourney, persistBlock, persistChatMessage, persistChatSettings, persistClearMatchingLearning, persistDatePlanStatus, persistDateProposal, persistDiscoverySignal, persistIcebreakerAnswer, persistLiveLocationShare, persistMatchDecision, persistMatchFeedback, persistMatchingPreferences, persistOnboardingProfile, persistPrivacySettings, persistProfileView, persistRelationshipJourneyEvent, persistRelationshipReflection, persistRelationshipReminder, persistReport, persistUnmatch, subscribePersistedChatMessages } from './src/services/appPersistence';
import { conversationIdFor, profileIdFor } from './src/domain/matchIdentity';
import { getLaunchReadinessSnapshot, productionDataModules, type AppDataModule } from './src/domain/appModel';
import { buildModerationQueue, summarizeModerationQueue, type ModerationQueueItem, type ModerationStatus } from './src/domain/moderation';
import { buildHomeGrowthLoop, type GrowthNudge, type HomeGrowthLoop, type ProfileGrowthInput, type RetentionLoop } from './src/domain/growth';
import { buildNetworkEffectPlan, type NetworkEffectPlan, type NetworkGrowthLoop } from './src/domain/networkEffects';
import { buildCityDensitySnapshot, resolveLaunchMarket, type CityDensitySnapshot } from './src/domain/cityDensity';
import { buildGrowthEngineSnapshot, growthFunnelEvents, type GrowthEngineSnapshot } from './src/domain/growthEngine';
import { annualSavingsLabel, billingPeriodLabel, buildPaymentEntitlementSnapshot, buildRestorePreview, checkoutSteps, executivePlan, formatMoney, membershipPlans, membershipPriceLabel, sparkPacks, type BillingCycle, type PaymentEntitlementGate, type PaymentEntitlementSnapshot, type ProductKind } from './src/domain/monetization';
import { buildMonetizationOperationsSnapshot, previewEntitlementAllowed, type MonetizationOperationsSnapshot } from './src/domain/monetizationOps';
import { buildPilotReadinessSnapshot, type PilotReadinessSnapshot } from './src/domain/pilotReadiness';
import { restoreStorePurchases, sendGoldenSpark } from './src/services/billing';
import { buildReportActionPlan, buildSafetyChecklist, safetyReadinessScore, scanMessageSafety, type MessageSafetyScan, type SafetyChecklistItem } from './src/domain/safety';
import { buildProductQualitySnapshot, type ProductQualityItem } from './src/domain/productQuality';
import { buildInteractionAuditSnapshot, type InteractionAuditSnapshot } from './src/domain/interactionQuality';
import { buildReleaseReadinessSnapshot, type ReleaseGate, type ReleaseReadinessSnapshot } from './src/domain/releaseReadiness';
import { buildStoreReviewSnapshot, type StoreReviewSnapshot } from './src/domain/storeReview';
import { buildPolicyComplianceSnapshot, type PolicyComplianceSnapshot } from './src/domain/policyCompliance';
import { buildDateMarketplaceSnapshot, type DateMarketplaceSnapshot } from './src/domain/dateMarketplace';
import { buildP1OperationsSnapshot, type P1OperationItem, type P1OperationsSnapshot } from './src/domain/p1Operations';
import { buildMarketplaceOpsSnapshot, type MarketplaceOpsSnapshot } from './src/domain/marketplaceOps';
import { buildTrustOpsSnapshot, type TrustOpsGate, type TrustOpsSnapshot } from './src/domain/trustOps';
import { buildLegalStoreOpsSnapshot, type LegalStoreOpsGate, type LegalStoreOpsSnapshot } from './src/domain/legalStoreOps';
import { buildBackendLaunchSnapshot, type BackendLaunchGate, type BackendLaunchSnapshot } from './src/domain/backendReadiness';
import { buildNotificationReadinessSnapshot, type NotificationGate, type NotificationReadinessSnapshot } from './src/domain/notificationReadiness';
import { buildGiftFulfillmentReadinessSnapshot, type GiftFulfillmentGate, type GiftFulfillmentReadinessSnapshot } from './src/domain/giftFulfillmentReadiness';
import { buildPlacesReservationReadinessSnapshot, type PlacesReservationGate, type PlacesReservationReadinessSnapshot } from './src/domain/placesReservationReadiness';
import { buildMarketplaceBookingTimeline, calculateMarketplaceRefund, type MarketplaceBookingStatus } from './src/domain/marketplaceBooking';
import { buildObservabilityReadinessSnapshot, type ObservabilityGate, type ObservabilityReadinessSnapshot } from './src/domain/observabilityReadiness';
import { buildAbuseFraudReadinessSnapshot, type AbuseFraudGate, type AbuseFraudReadinessSnapshot } from './src/domain/abuseFraudReadiness';
import { buildRelationshipJourney, type RelationshipReflection } from './src/domain/relationshipJourney';
import { buildRelationshipLearningState, type RelationshipJourneyEventName } from './src/domain/relationshipLearning';
import { chatMoreAttachments, chatPrimaryAttachments, primaryNavigation, relationshipJourneySteps } from './src/domain/featureFocus';
import { memberNeedsOnboarding } from './src/domain/memberBootstrap';
import { canCommitMemberMutation, evaluateMemberDataRuntime, memberMutationFailureMessage, type MemberMutationResult } from './src/domain/memberDataRuntime';
import { buildDailyIntroductionDeck } from './src/domain/dailyIntroductions';
import { buildAlignmentBridge, buildIntentPassport, type AlignmentBridgeItem, type IntentPassportInput } from './src/domain/intentPassport';
import { buildCoupleModeAccess, coupleModeRoutes, guardCoupleModeRoute, initialCoupleModeState, reduceCoupleMode, type CoupleModeRoute, type CoupleModeState, type ExperienceMode } from './src/domain/coupleMode';
import { createLocalCoupleModeRepository } from './src/services/coupleModeRepository';
import { fetchCurrentCoupleConnectionHub, respondToCoupleConnectionRequest, saveCoupleModeMemberProfile, searchCouplePartnerByPhone, sendCoupleConnectionRequest, setServerCoupleMode, type CoupleConnectionHub, type CouplePartnerSummary } from './src/services/coupleConnection';
import { getCitiesOfState } from '@countrystatecity/countries-browser';
import { guardAuthenticatedScreen, requiresAuthenticatedSession } from './src/domain/authRoutes';
import { searchLivePlaces, type LivePlace } from './src/services/places';

type Screen = 'splash'|'welcome'|'auth'|'otp'|'verify'|'modeSelect'|'coupleSetup'|'profileSetup'|'vibes'|'intent'|'alignment'|'home'|'explore'|'circle'|'discovery'|'detail'|'mutual'|'icebreaker'|'chat'|'datePlan'|'safety'|'likes'|'profile'|'pricing'|'support'|'coach'|'events'|'executive'|'verifyHub'|'admin';

const previewScreens:Screen[]=['splash','welcome','auth','otp','verify','modeSelect','coupleSetup','profileSetup','vibes','intent','alignment','home','explore','circle','discovery','detail','mutual','icebreaker','chat','datePlan','safety','likes','profile','pricing','support','coach','events','executive','verifyHub','admin'];

function getPreviewScreen():Screen|undefined{
  if(Platform.OS!=='web'||backendRuntime.mode!=='demo'||typeof window==='undefined')return undefined;
  const requested=new URLSearchParams(window.location.search).get('preview') as Screen|null;
  return requested&&previewScreens.includes(requested)?requested:undefined;
}

const showcasePreviewScreen=getPreviewScreen();
const showcaseOnboardingScreens=new Set<Screen>(['splash','welcome','auth','otp','verify','modeSelect','coupleSetup','profileSetup','vibes','intent','alignment']);
const showcaseExperienceMode:ExperienceMode=Platform.OS==='web'&&typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('mode')==='couple'?'couple':'seeking';
const showcaseMemberProfile:ProfileDraft={
  firstName:'Aarav',
  gender:'man',
  age:'30',
  city:'Toronto, ON',
  height:'5 ft 10 in',
  profession:'Product Strategist',
  religion:'Hindu',
  community:'Punjabi',
};
const isCustomerShowcase=Boolean(showcasePreviewScreen&&!showcaseOnboardingScreens.has(showcasePreviewScreen));

type RoseAvailability = { freeAvailable: boolean; paidCredits: number };
type RosePopupPayload = { match: Match; note: string; paid: boolean };
type AppNotice = { title: string; body: string; icon: keyof typeof Ionicons.glyphMap; tone?: PremiumIconTone; actionLabel?: string; actionScreen?: Screen };
type MemberMatchLoadState = 'preview' | 'loading' | 'ready' | 'error';
type CoupleLaunchTool = 'gift' | 'games' | null;
const destinyOneLogo = require('./assets/destinyone-logo.png');
const premiumRose = require('./assets/premium-red-rose.png');
const icebreakerQuestion = 'Coffee date ☕ or road trip 🚗?';

const todayKey = () => new Date().toISOString().slice(0, 10);
const memberDataRuntime = evaluateMemberDataRuntime(backendRuntime.mode, allowsPreviewAuthBypass);
const coupleModeRepository=createLocalCoupleModeRepository(AsyncStorage);

const showcaseCoupleModeState:CoupleModeState=showcaseExperienceMode==='couple'
  ?reduceCoupleMode(reduceCoupleMode(initialCoupleModeState,{type:'select_experience',mode:'couple',at:new Date().toISOString()}),{type:'link_partner',connectionId:'preview-couple',partner:{memberId:'preview-partner',displayName:'My Partner'},at:new Date().toISOString()})
  :initialCoupleModeState;

function isCoupleModeRoute(screen:Screen):screen is Screen&CoupleModeRoute{
  return (coupleModeRoutes as readonly string[]).includes(screen);
}

function getRoseAvailability(ledger: RoseLedger): RoseAvailability {
  const today = todayKey();
  return { freeAvailable: ledger.dayKey !== today || !ledger.freeUsed, paidCredits: ledger.paidCredits };
}

function mergeChatMessageList(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map<string, ChatMessage>();
  [...current, ...incoming].forEach(message => byId.set(message.id, message));
  return [...byId.values()].sort((a,b)=>a.createdAt-b.createdAt);
}

function isChatMessage(value: unknown): value is ChatMessage {
  return !!value && typeof value === 'object' && !Array.isArray(value) && typeof (value as ChatMessage).id === 'string' && typeof (value as ChatMessage).createdAt === 'number';
}

function isIcebreakerWaitingForOtherAnswer(data: unknown) {
  return !!data && typeof data === 'object' && !Array.isArray(data) && (data as { unlocked?: unknown }).unlocked === false;
}

function isMutualMatchDecision(data: unknown) {
  return !!data && typeof data === 'object' && !Array.isArray(data) && (data as { matched?: unknown }).matched === true;
}

function backendDateStatus(value: unknown): DatePlanStatus {
  return value==='accepted'||value==='declined'||value==='countered'||value==='completed'?value:'proposed';
}

function intentFromDatabase(value:string) {
  return value==='marriage'?'Marriage':value==='long_term'?'Long-term Relationship':'Long-term, leading to Marriage';
}

function DestinyOneApp() {
  // Local state remains only for preview/offline UX. Production builds are
  // guarded in src/services/backend.ts and must connect Supabase before auth.
  const [poppins] = usePoppins({Poppins_400Regular,Poppins_600SemiBold,Poppins_700Bold});
  const [satisfy] = useSatisfy({Satisfy_400Regular});
  const [screen,setScreen] = useState<Screen>(()=>showcasePreviewScreen??'splash');
  const [selected,setSelected] = useState<Match>(matches[0]!);
  const [datePlanPreset,setDatePlanPreset] = useState<PlaceItem|null>(null);
  const [vibeList,setVibeList] = useState<string[]>([]);
  const [intent,setIntent] = useState('Long-term, leading to Marriage');
  const [alignment,setAlignment] = useState<Record<string,string>>({});
  const [verified,setVerified] = useState(isCustomerShowcase);
  const [authDestination,setAuthDestination] = useState('');
  const [authPassword,setAuthPassword] = useState('');
  const [onboardingComplete,setOnboardingComplete] = useState(isCustomerShowcase);
  const [profileDraft,setProfileDraft] = useState<ProfileDraft>(isCustomerShowcase?showcaseMemberProfile:initialPersistedState.profileDraft);
  const [chatMessages,setChatMessages] = useState<Record<string,ChatMessage[]>>({});
  const [chatDrafts,setChatDrafts] = useState<Record<string,string>>({});
  const [coinBalance,setCoinBalance] = useState(memberDataRuntime.initialCoinBalance);
  const [profilePhotos,setProfilePhotos] = useState<string[]>([]);
  const [selfieUri,setSelfieUri] = useState('');
  const [voiceIntroUri,setVoiceIntroUri] = useState('');
  const [vouches,setVouches] = useState<string[]>([]);
  const [discoverySignals,setDiscoverySignals] = useState<DiscoverySignal[]>([]);
  const [smartDiscovery,setSmartDiscovery] = useState(true);
  const [crossedPaths,setCrossedPaths] = useState(false);
  const [blockedIds,setBlockedIds] = useState<string[]>([]);
  const [reports,setReports] = useState<LocalReport[]>([]);
  const [safeCheckIns,setSafeCheckIns] = useState<string[]>([]);
  const [matchFilters,setMatchFilters] = useState<MatchFilters>(defaultMatchFilters);
  const [roseLedger,setRoseLedger] = useState<RoseLedger>(initialPersistedState.roseLedger);
  const [roseTarget,setRoseTarget] = useState<Match|null>(null);
  const [rosePopup,setRosePopup] = useState<RosePopupPayload|null>(null);
  const [appNotice,setAppNotice] = useState<AppNotice|null>(null);
  const [referralOfferOpen,setReferralOfferOpen] = useState(false);
  const [referralCode] = useState(()=>`D1-${Date.now().toString(36).slice(-6).toUpperCase()}`);
  const [detailSafetyOpen,setDetailSafetyOpen] = useState(false);
  const [dismissedIds,setDismissedIds] = useState<string[]>([]);
  const [profileViewNotifiedIds,setProfileViewNotifiedIds] = useState<string[]>([]);
  const [lastSeenVisible,setLastSeenVisible] = useState(initialPersistedState.lastSeenVisible);
  const [analyticsConsent,setAnalyticsConsent] = useState(initialPersistedState.analyticsConsent);
  const [chatSettings,setChatSettings] = useState<Record<string,CoupleChatSettings>>(initialPersistedState.chatSettings);
  const [relationshipReflections,setRelationshipReflections] = useState<Record<string,RelationshipReflectionRecord>>(initialPersistedState.relationshipReflections);
  const [relationshipReminders,setRelationshipReminders] = useState<Record<string,RelationshipReminderRecord>>(initialPersistedState.relationshipReminders);
  const [serverMatches,setServerMatches] = useState<Match[]|null>(memberDataRuntime.allowsMockMatches?null:[]);
  const [matchLoadState,setMatchLoadState] = useState<MemberMatchLoadState>(memberDataRuntime.allowsMockMatches?'preview':'loading');
  const [matchingPoolStatus,setMatchingPoolStatus] = useState<MatchingPoolStatus|null>(null);
  const [coupleMode,setCoupleMode] = useState<CoupleModeState>(showcaseCoupleModeState);
  const [coupleHub,setCoupleHub] = useState<CoupleConnectionHub>({experienceMode:showcaseExperienceMode,connection:null,incomingRequests:[],outgoingRequests:[]});
  const [chatLaunchTool,setChatLaunchTool] = useState<CoupleLaunchTool>(null);
  const [hydrated,setHydrated] = useState(false);
  const [authenticated,setAuthenticated] = useState(memberDataRuntime.source!=='server');
  const couplePartnerName=coupleMode.connection.partner?.displayName.trim()||'My Partner';
  const couplePartner:Match={
    ...matches[0]!,
    id:`couple-${coupleMode.connection.connectionId??'space'}`,
    profileId:coupleMode.connection.partner?.memberId,
    matchId:coupleMode.connection.connectionId??undefined,
    name:couplePartnerName,
    city:profileDraft.city||'Private couple space',
    profession:'Your partner',
    intent:'Committed relationship',
    match:'Exceptional Match',
    vibes:['Together','Private','Intentional'],
    photo:'',
    photos:[],
  };
  const conversationPartner=coupleMode.experienceMode==='couple'?couplePartner:selected;
  const coupleAccess=buildCoupleModeAccess(coupleMode);
  const applyCoupleHub=(hub:CoupleConnectionHub)=>{
    setCoupleHub(hub);
    if(!hub.connection){
      if(hub.experienceMode==='couple')setCoupleMode(current=>current.experienceMode==='couple'?current:reduceCoupleMode(current,{type:'select_experience',mode:'couple',at:new Date().toISOString()}));
      return;
    }
    const connection=hub.connection;
    setCoupleMode(current=>{
      if(current.connection.status==='active'&&current.connection.connectionId===connection.connectionId)return current;
      const at=new Date().toISOString();
      const inCoupleMode=current.experienceMode==='couple'?current:reduceCoupleMode(current,{type:'select_experience',mode:'couple',at});
      return reduceCoupleMode(inCoupleMode,{type:'link_partner',connectionId:connection.connectionId,partner:{memberId:connection.partnerMemberId,displayName:connection.partnerDisplayName},at});
    });
  };

  const refreshServerMatches=async()=>{
    if(memberDataRuntime.source!=='server')return;
    setMatchLoadState('loading');
    try{
      const [daily,pool]=await Promise.all([fetchDailyMatches(5),fetchMatchingPoolStatus()]);
      setServerMatches(daily??[]);
      setMatchingPoolStatus(pool);
      setMatchLoadState('ready');
    }catch(error){
      setServerMatches([]);
      setMatchLoadState('error');
      setAppNotice({title:'Matches unavailable',body:error instanceof Error?error.message:'Your curated matches could not be loaded securely. Please try again.',icon:'cloud-offline-outline',tone:'ruby'});
    }
  };

  useEffect(()=>{
    let active=true;
    const started=Date.now();
    Promise.all([loadAppState(),coupleModeRepository.load()]).then(async ([saved,savedCoupleMode])=>{
      if(!active)return;
      let nextScreen:Screen='welcome';
      if(memberDataRuntime.allowsLocalHydration){
        if(!showcasePreviewScreen){
        setCoupleMode(savedCoupleMode);
        setAuthDestination(saved.authDestination);
        setVerified(saved.verified);
        setProfileDraft({...initialPersistedState.profileDraft,...saved.profileDraft});
        setVibeList(saved.vibes);
        setIntent(saved.intent);
        setAlignment(saved.alignment);
        setChatMessages(saved.chats);
        setCoinBalance(saved.coinBalance);
        setProfilePhotos(saved.photos);
        setSelfieUri(saved.selfieUri);
        setVoiceIntroUri(saved.voiceIntroUri);
        setVouches(saved.vouches);
        setDiscoverySignals(saved.discoverySignals);
        setSmartDiscovery(saved.smartDiscovery);
        setCrossedPaths(saved.crossedPaths);
        setBlockedIds(saved.blockedIds);
        setReports(saved.reports);
        setSafeCheckIns(saved.safeCheckIns);
        setMatchFilters({...defaultMatchFilters,...saved.matchFilters});
        setRoseLedger({...initialPersistedState.roseLedger,...saved.roseLedger});
        setLastSeenVisible(saved.lastSeenVisible ?? true);
        setAnalyticsConsent(saved.analyticsConsent ?? false);
        setChatSettings(saved.chatSettings ?? {});
        setRelationshipReflections(saved.relationshipReflections ?? {});
        setRelationshipReminders(saved.relationshipReminders ?? {});
        nextScreen=saved.onboardingComplete?'home':'welcome';
        setOnboardingComplete(saved.onboardingComplete);
        }
      }
      if(memberDataRuntime.source==='server'){
        try{
          const member=await loadCurrentMemberBootstrap();
          const needsOnboarding=member?memberNeedsOnboarding(member):false;
          nextScreen=!member?'welcome':needsOnboarding?'profileSetup':'home';
          setOnboardingComplete(Boolean(member&&!needsOnboarding));
          setVerified(member?.profile?.verified===true);
          if(!member)setAuthDestination('');
          if(member?.profile){
            setProfileDraft(current=>({...current,firstName:member.profile?.first_name??'',gender:member.matchAttributes?.gender??current.gender,city:member.profile?.city??'',profession:member.profile?.profession??'',religion:member.profile?.religion??'',community:member.profile?.community??''}));
          }
          if(member?.matchingPreferences){
            const serverPreferences=member.matchingPreferences;
            setMatchFilters({
              lookingFor:serverPreferences.looking_for==='women'?'Women':serverPreferences.looking_for==='men'?'Men':'Everyone',
              minAge:serverPreferences.min_age,maxAge:serverPreferences.max_age,cities:serverPreferences.cities,
              intents:serverPreferences.intents.map(intentFromDatabase),mustHaveVibes:serverPreferences.must_have_vibes,
              familyPriority:serverPreferences.family_priority,children:serverPreferences.children,
              marriageTimeline:serverPreferences.marriage_timeline,relocation:serverPreferences.relocation,
              distancePreference:serverPreferences.distance_preference,
            });
            setSmartDiscovery(serverPreferences.smart_discovery);
          }
          if(member&&!needsOnboarding){
            await refreshServerMatches();
          }else{
            setMatchLoadState('ready');
          }
        }catch(error){
          nextScreen='welcome';
          setOnboardingComplete(false);
          setVerified(false);
          setMatchLoadState('error');
          setAppNotice({title:'Secure sign-in required',body:error instanceof Error?error.message:'The production backend could not restore your session.',icon:'shield-outline',tone:'ruby'});
        }
      }
      const remaining=Math.max(0,3000-(Date.now()-started));
      setTimeout(()=>{if(active){setScreen(showcasePreviewScreen??nextScreen);setHydrated(true)}},remaining);
    });
    return()=>{active=false};
  },[]);

  useEffect(()=>{
    if(memberDataRuntime.source!=='server')return;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      const signedIn=Boolean(session?.user);
      setAuthenticated(signedIn);
      if(event==='SIGNED_OUT'){
        setOnboardingComplete(false);
        setAuthDestination('');
        setScreen('welcome');
      }
    });
    return()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(memberDataRuntime.source!=='server'||!hydrated||authenticated||!requiresAuthenticatedSession(screen))return;
    setScreen(guardAuthenticatedScreen(screen,false) as Screen);
  },[authenticated,hydrated,screen]);

  useEffect(()=>{
    if(!hydrated||!memberDataRuntime.allowsLocalPersistence)return;
    if(showcasePreviewScreen)return;
    const timer=setTimeout(()=>{
      void saveAppState({onboardingComplete,authDestination,verified,profileDraft,vibes:vibeList,intent,alignment,chats:chatMessages,coinBalance,photos:profilePhotos,selfieUri,voiceIntroUri,vouches,discoverySignals,smartDiscovery,crossedPaths,blockedIds,reports,safeCheckIns,matchFilters,roseLedger,lastSeenVisible,analyticsConsent,chatSettings,relationshipReflections,relationshipReminders});
      void coupleModeRepository.save(coupleMode);
    },250);
    return()=>clearTimeout(timer);
  },[hydrated,onboardingComplete,authDestination,verified,profileDraft,vibeList,intent,alignment,chatMessages,coinBalance,profilePhotos,selfieUri,voiceIntroUri,vouches,discoverySignals,smartDiscovery,crossedPaths,blockedIds,reports,safeCheckIns,matchFilters,roseLedger,lastSeenVisible,analyticsConsent,chatSettings,relationshipReflections,relationshipReminders,coupleMode]);
  useEffect(()=>{configureAnalyticsConsent(hydrated&&analyticsConsent)},[hydrated,analyticsConsent]);
  useEffect(()=>{
    if(!hydrated||!['coupleSetup','home','profile'].includes(screen))return;
    let active=true;
    const sync=()=>void fetchCurrentCoupleConnectionHub().then(hub=>{if(active)applyCoupleHub(hub)}).catch(()=>undefined);
    sync();
    const timer=setInterval(sync,coupleMode.experienceMode==='couple'?8000:60000);
    return()=>{active=false;clearInterval(timer)};
  },[hydrated,coupleMode.experienceMode,screen]);
  useEffect(()=>{
    if(coupleMode.experienceMode!=='couple'||!isCoupleModeRoute(screen))return;
    const decision=guardCoupleModeRoute(coupleMode,screen);
    if(!decision.allowed&&decision.resolved!==screen)setScreen(decision.resolved as Screen);
  },[coupleMode,screen]);
  useEffect(()=>{
    if(Platform.OS!=='web')return;
    window.scrollTo({top:0,left:0,behavior:'auto'});
  },[screen]);
  useEffect(()=>{
    if(!hydrated||screen!=='chat')return;
    const matchId=conversationPartner.id;
    const backendMatchId=conversationIdFor(conversationPartner);
    let active=true;
    void Promise.all([fetchPersistedChatMessages(backendMatchId),fetchPersistedRelationshipJourney(backendMatchId)]).then(([messages,journeyData])=>{
      if(!active)return;
      const journey=journeyData&&typeof journeyData==='object'&&!Array.isArray(journeyData)?journeyData as {proposal?:unknown;reflection?:unknown;reminder?:unknown}:null;
      const proposal=journey?.proposal&&typeof journey.proposal==='object'&&!Array.isArray(journey.proposal)?journey.proposal as {id?:unknown;status?:unknown}:null;
      const reflection=journey?.reflection&&typeof journey.reflection==='object'&&!Array.isArray(journey.reflection)?journey.reflection as {choice?:unknown;use_for_matching?:unknown;created_at?:unknown;updated_at?:unknown}:null;
      const reminder=journey?.reminder&&typeof journey.reminder==='object'&&!Array.isArray(journey.reminder)?journey.reminder as {enabled?:unknown;reminder_at?:unknown}:null;
      const proposalId=typeof proposal?.id==='string'?proposal.id:undefined;
      const merged=mergeChatMessageList(chatMessages[matchId]??[],messages);
      const latestDate=[...merged].reverse().find(message=>message.type==='date'&&message.date&&(message.date.proposalId===proposalId||!message.date.proposalId));
      const hydratedMessages=proposalId&&latestDate?merged.map(message=>message.id===latestDate.id&&message.date?{...message,date:{...message.date,proposalId,planStatus:backendDateStatus(proposal?.status)}}:message):merged;
      if(hydratedMessages.length>0)setChatMessages(current=>({...current,[matchId]:mergeChatMessageList(current[matchId]??[],hydratedMessages)}));
      if(latestDate&&reflection&&['continue','pause','close'].includes(String(reflection.choice))){
        const createdAt=typeof reflection.created_at==='string'?Date.parse(reflection.created_at):Date.now();
        const updatedAt=typeof reflection.updated_at==='string'?Date.parse(reflection.updated_at):createdAt;
        setRelationshipReflections(current=>({...current,[matchId]:{choice:reflection.choice as RelationshipReflectionChoice,dateMessageId:latestDate.id,dateProposalId:proposalId,useForMatching:reflection.use_for_matching===true,createdAt,updatedAt}}));
      }
      if(latestDate&&reminder){
        setRelationshipReminders(current=>({...current,[matchId]:{enabled:reminder.enabled===true,dateMessageId:latestDate.id,dateProposalId:proposalId,scheduledFor:typeof reminder.reminder_at==='string'?reminder.reminder_at:undefined,updatedAt:Date.now()}}));
      }
    });
    const unsubscribe=subscribePersistedChatMessages(backendMatchId,message=>{
      setChatMessages(current=>({...current,[matchId]:mergeChatMessageList(current[matchId]??[],[message])}));
    });
    return()=>{active=false;unsubscribe()};
  },[hydrated,screen,conversationPartner.id]);
  if(!poppins||!satisfy)return <View style={{flex:1,backgroundColor:colors.black}}/>;
  const chooseExperienceMode=(mode:ExperienceMode)=>{
    if(mode==='seeking'&&(coupleMode.connection.status==='active'||coupleMode.connection.status==='paused')){
      setAppNotice({title:'Your couple space is still connected',body:'Disconnecting must be confirmed before matching can be enabled again.',icon:'lock-closed-outline',tone:'gold'});
      return;
    }
    const at=new Date().toISOString();
    setCoupleMode(current=>reduceCoupleMode(current,{type:'select_experience',mode,at}));
    if(mode==='seeking'){
      setChatLaunchTool(null);
      setCoupleHub({experienceMode:'seeking',connection:null,incomingRequests:[],outgoingRequests:[]});
      void setServerCoupleMode(false).catch(error=>setAppNotice({title:'Mode not updated',body:error instanceof Error?error.message:'Could not update Couple Mode.',icon:'cloud-offline-outline',tone:'ruby'}));
    }
  };
  const navigateTo=(target:Screen)=>{
    if(coupleMode.experienceMode==='couple'&&isCoupleModeRoute(target)){
      const decision=guardCoupleModeRoute(coupleMode,target);
      if(!decision.allowed){
        setScreen(decision.resolved as Screen);
        setAppNotice(decision.reason==='partner_connection_required'
          ?{title:'Connect your partner first',body:'Chat, shared date plans, gifts and games unlock only inside a connected two-person space.',icon:'link-outline',tone:'gold',actionLabel:'Set up our space',actionScreen:'coupleSetup'}
          :{title:'Matching is off in Couple Mode',body:'Profiles, Discover, Likes and Executive introductions stay hidden while you use DestinyOne with your partner.',icon:'heart-circle-outline',tone:'gold'});
        return;
      }
    }
    setScreen(target);
  };
  const openCoupleTool=(tool:Exclude<CoupleLaunchTool,null>)=>{
    const allowed=tool==='gift'?coupleAccess.capabilities.canSendGifts:coupleAccess.capabilities.canPlayGames;
    if(!allowed){navigateTo('chat');return}
    setChatLaunchTool(tool);
    navigateTo('chat');
  };
  const saveCoupleProfile=async(input:{firstName:string;age:string;city:string;profession:string})=>{
    await saveCoupleModeMemberProfile(input);
    await setServerCoupleMode(true);
    setProfileDraft(current=>({...current,firstName:input.firstName.trim(),age:input.age.trim(),city:input.city.trim(),profession:input.profession.trim()}));
    setOnboardingComplete(true);
  };
  const searchCouplePartner=(phone:string)=>searchCouplePartnerByPhone(phone);
  const requestCoupleConnection=async(member:CouplePartnerSummary)=>{
    const request=await sendCoupleConnectionRequest(member);
    setCoupleHub(current=>({...current,outgoingRequests:[request]}));
    return request;
  };
  const respondCoupleConnection=async(requestId:string,accept:boolean)=>{
    const hub=await respondToCoupleConnectionRequest(requestId,accept);
    applyCoupleHub(hub);
    if(accept&&hub.connection)setScreen('home');
  };
  const shareCoupleSpace=()=>{
    const webUrl=Platform.OS==='web'&&typeof window!=='undefined'?`${window.location.origin}${window.location.pathname}?preview=modeSelect&mode=couple`:'https://destinyone.app/couple';
    void Share.share({title:'Join me on DestinyOne',message:`Create your DestinyOne account with your verified phone number, choose Couple Mode, then we can find each other by exact phone number: ${webUrl}`});
  };
  const recordJourneyEvent=(name:RelationshipJourneyEventName,properties:Record<string,string|boolean>)=>{
    track(name,properties as never);
    if(analyticsConsent)void persistRelationshipJourneyEvent(name,properties);
  };
  const confirmMemberMutation=(result:MemberMutationResult,title:string,fallback:string)=>{
    if(canCommitMemberMutation(memberDataRuntime,result))return true;
    setAppNotice({title,body:memberMutationFailureMessage(result,fallback),icon:'cloud-offline-outline',tone:'ruby'});
    return false;
  };
  const trackDiscovery=(type:DiscoverySignal['type'],match:Match)=>{
    track('discovery_signal',{type});
    setDiscoverySignals(current=>[...current.slice(-49),{id:`${Date.now()}-${Math.random()}`,type,matchId:match.id,createdAt:Date.now()}]);
    if(type==='view')void persistDiscoverySignal(profileIdFor(match),'view');
  };
  const openDetail=(m:Match)=>{trackDiscovery('view',m);setSelected(m);setScreen('detail')};
  const chooseInterested=async(match:Match)=>{
    const result=await persistMatchDecision(profileIdFor(match),'interested');
    if(!confirmMemberMutation(result,'Interest not sent','Your interest could not be confirmed. Please try again.'))return;
    setSelected(match);
    trackDiscovery('interested',match);
    if(memberDataRuntime.source==='preview'||isMutualMatchDecision(result.data)){setScreen('mutual');return}
    setDismissedIds(current=>[...new Set([...current,match.id])]);
    setAppNotice({title:'Interest sent privately',body:`If ${match.name} chooses you too, DestinyOne will open a mutual match and icebreaker.`,icon:'heart-outline',tone:'gold'});
  };
  const passMatch=async(match:Match)=>{
    const result=await persistMatchDecision(profileIdFor(match),'pass');
    if(!confirmMemberMutation(result,'Pass not saved','This profile could not be removed securely. Please try again.'))return;
    trackDiscovery('skip',match);
    setDismissedIds(current=>[...new Set([...current,match.id])]);
  };
  const answerIcebreaker=async(answer:string)=>{
    const result=await persistIcebreakerAnswer(conversationIdFor(selected),icebreakerQuestion,answer);
    if(!confirmMemberMutation(result,'Answer not saved','Your icebreaker answer could not be confirmed. Please try again.'))return;
    if(result.saved&&isIcebreakerWaitingForOtherAnswer(result.data)){
      setAppNotice({title:'Answer saved',body:`Chat unlocks as soon as ${selected.name} answers the same icebreaker. We’ll keep it pressure-free.`,icon:'sparkles',tone:'gold'});
      setScreen('home');
      return;
    }
    setScreen('chat');
  };
  const notifyProfileView=async(match:Match)=>{
    if(profileViewNotifiedIds.includes(match.id))return;
    const result=await persistProfileView(profileIdFor(match),5);
    if(!confirmMemberMutation(result,'Profile view not recorded','The profile-view notification could not be confirmed.'))return;
    setProfileViewNotifiedIds(current=>current.includes(match.id)?current:[...current,match.id]);
    setAppNotice({title:'Profile view notification sent',body:`${match.name} gets a tasteful notification because you spent 5+ seconds on the full profile. Swipe previews stay private.`,icon:'eye-outline',tone:'gold'});
  };
  const localRankedMatches=rankMatches(matches,{intent,vibes:vibeList,filters:matchFilters},discoverySignals,blockedIds,smartDiscovery);
  const rankedMatches=serverMatches===null?localRankedMatches:serverMatches.filter(match=>!blockedIds.includes(match.id));
  const visibleMatches=rankedMatches.filter(match=>!dismissedIds.includes(match.id));
  const roseAvailability=getRoseAvailability(roseLedger);
  const openRose=(match:Match)=>setRoseTarget(match);
  const createRoseMessage=(note:string):ChatMessage=>({id:`spark-${Date.now()}`,type:'gift',text:note,gift:{name:'Golden Spark',emoji:'✨'},createdAt:Date.now(),status:'sent'});
  const appendChatMessage=async(match:Match,message:ChatMessage)=>{
    const matchId=match.id;
    if(memberDataRuntime.source==='preview'){
      setChatMessages(current=>({...current,[matchId]:[...(current[matchId]??[]),message]}));
      return true;
    }
    let nextMessage=message;
    if(message.type==='date'&&message.date){
      const proposalResult=await persistDateProposal(conversationIdFor(match),message.date);
      if(!confirmMemberMutation(proposalResult,'Date plan not sent','Your date proposal could not be confirmed. Please try again.'))return false;
      const data=proposalResult.data as {id?:unknown;status?:unknown}|undefined;
      if(typeof data?.id==='string')nextMessage={...message,date:{...message.date,proposalId:data.id,planStatus:data.status==='accepted'?'accepted':'proposed'}};
    }
    if(message.type==='location'&&message.location?.live){
      const locationResult=await persistLiveLocationShare(conversationIdFor(match),message.location,message.id);
      if(!confirmMemberMutation(locationResult,'Location not shared','Your live location could not be activated securely.'))return false;
    }
    const result=await persistChatMessage(conversationIdFor(match),nextMessage);
    if(!confirmMemberMutation(result,'Message not sent','Your message could not be delivered securely. Please try again.'))return false;
    if(!isChatMessage(result.data)){
      setAppNotice({title:'Message not sent',body:'The secure server returned an invalid message acknowledgement.',icon:'cloud-offline-outline',tone:'ruby'});
      return false;
    }
    setChatMessages(current=>({...current,[matchId]:mergeChatMessageList(current[matchId]??[],[result.data as ChatMessage])}));
    return true;
  };
  const updateDatePlanStatus=async(matchId:string,messageId:string,status:DatePlanStatus)=>{
    const message=(chatMessages[matchId]??[]).find(item=>item.id===messageId);
    if(!message?.date)return;
    const previousStatus=message.date.planStatus??'proposed';
    const result=await persistDatePlanStatus(message.date.proposalId,status);
    if(!confirmMemberMutation(result,'Date status not updated','The date response could not be confirmed. Please try again.'))return;
    setChatMessages(current=>({...current,[matchId]:(current[matchId]??[]).map(item=>item.id===messageId&&item.date?{...item,date:{...item.date,planStatus:status}}:item)}));
    recordJourneyEvent('date_plan_status_changed',{from_status:previousStatus,to_status:status});
  };
  const saveReflection=async(matchId:string,messageId:string,choice:RelationshipReflectionChoice|null)=>{
    if(!choice){
      if(memberDataRuntime.source==='server'){setAppNotice({title:'Reflection unchanged',body:'Secure reflection replacement is not available yet. Your saved private answer was kept.',icon:'lock-closed-outline',tone:'gold'});return}
      setRelationshipReflections(current=>{const next={...current};delete next[matchId];return next});return;
    }
    const message=(chatMessages[matchId]??[]).find(item=>item.id===messageId);
    const useForMatching=relationshipReflections[matchId]?.useForMatching??false;
    const result=await persistRelationshipReflection(message?.date?.proposalId,choice,useForMatching);
    if(!confirmMemberMutation(result,'Reflection not saved','Your private reflection could not be confirmed.'))return;
    const now=Date.now();
    setRelationshipReflections(current=>({...current,[matchId]:{choice,dateMessageId:messageId,dateProposalId:message?.date?.proposalId,useForMatching,createdAt:current[matchId]?.createdAt??now,updatedAt:now}}));
    recordJourneyEvent('private_reflection_saved',{choice});
  };
  const updateRelationshipLearningConsent=async(matchId:string,enabled:boolean)=>{
    const reflection=relationshipReflections[matchId];
    if(!reflection)return;
    const result=await persistRelationshipReflection(reflection.dateProposalId,reflection.choice,enabled);
    if(!confirmMemberMutation(result,'Matching preference not updated','Your consent setting could not be confirmed.'))return;
    setRelationshipReflections(current=>({...current,[matchId]:{...reflection,useForMatching:enabled,updatedAt:Date.now()}}));
    recordJourneyEvent('relationship_learning_consent_changed',{enabled});
  };
  const updateRelationshipReminder=async(matchId:string,messageId:string,enabled:boolean)=>{
    const message=(chatMessages[matchId]??[]).find(item=>item.id===messageId);
    if(!message?.date)return;
    const result=await persistRelationshipReminder(message.date.proposalId,enabled);
    if(!confirmMemberMutation(result,'Reminder not updated','Your private reminder could not be confirmed.'))return;
    const data=result.data as {reminder_at?:unknown}|undefined;
    setRelationshipReminders(current=>({...current,[matchId]:{enabled,dateMessageId:messageId,dateProposalId:message.date?.proposalId,scheduledFor:typeof data?.reminder_at==='string'?data.reminder_at:current[matchId]?.scheduledFor,updatedAt:Date.now()}}));
    recordJourneyEvent('date_reminder_changed',{enabled});
  };
  const updateLastSeenPrivacy=async(value:boolean)=>{
    const result=await persistPrivacySettings({lastSeenVisible:value,onlineStatusVisible:value});
    if(!confirmMemberMutation(result,'Privacy setting not saved','Your visibility setting could not be confirmed.'))return;
    setLastSeenVisible(value);
  };
  const updateAnalyticsPrivacy=async(value:boolean)=>{
    const result=await persistPrivacySettings({analyticsConsent:value});
    if(!confirmMemberMutation(result,'Privacy setting not saved','Your analytics choice could not be confirmed.'))return;
    setAnalyticsConsent(value);
  };
  const updateSelectedChatSettings=async(settings:CoupleChatSettings)=>{
    const result=await persistChatSettings(conversationIdFor(conversationPartner),settings);
    if(!confirmMemberMutation(result,'Chat settings not saved','Your conversation settings could not be confirmed.'))return;
    setChatSettings(current=>({...current,[conversationPartner.id]:settings}));
  };
  const useCoachDraftInChat=(draft:string)=>{
    setChatDrafts(current=>({...current,[selected.id]:draft}));
    setScreen('chat');
  };
  const completeOnboarding=async()=>{
    const result=await persistOnboardingProfile({
      profile: profileDraft,
      photos: profilePhotos,
      selfieUri,
      voiceIntroUri,
      vibes: vibeList,
      intent,
      alignment,
      smartDiscovery,
      crossedPaths,
      lastSeenVisible,
      matchFilters,
    });
    if(!confirmMemberMutation(result,'Profile not completed','Your profile could not be saved securely. Please try again.'))return;
    setOnboardingComplete(true);
    setScreen('home');
    setReferralOfferOpen(true);
    if(memberDataRuntime.source==='server')await refreshServerMatches();
  };
  const updateMatchFilters=async(next:MatchFilters)=>{
    const result=await persistMatchingPreferences({filters:next,profile:profileDraft,alignment,smartDiscovery});
    if(!confirmMemberMutation(result,'Preferences not saved','Your match preferences could not be confirmed.'))return;
    setMatchFilters(next);
  };
  const updateSmartDiscovery=async(enabled:boolean)=>{
    const result=await persistMatchingPreferences({filters:matchFilters,profile:profileDraft,alignment,smartDiscovery:enabled});
    if(!confirmMemberMutation(result,'Discovery setting not saved','Smart Discovery could not be updated securely.'))return;
    setSmartDiscovery(enabled);
  };
  const clearMatchingActivity=async()=>{
    const result=await persistClearMatchingLearning();
    if(!confirmMemberMutation(result,'Activity not cleared','Your matching activity could not be cleared securely.'))return;
    setDiscoverySignals([]);
  };
  const submitSelectedMatchFeedback=async(feedback:'promising'|'not_aligned'|'met_in_person',useForMatching:boolean)=>{
    const result=await persistMatchFeedback(conversationIdFor(selected),feedback,useForMatching);
    if(result.reason==='error'){
      setAppNotice({title:'Feedback not saved',body:result.error??'Your private feedback could not be confirmed. Please try again.',icon:'cloud-offline-outline',tone:'ruby'});
      return false;
    }
    setAppNotice({title:'Private reflection saved',body:useForMatching?'Your feedback can improve future introductions. Personal notes and internal scores are never shared with members.':'Your reflection was saved without using it for future matching.',icon:'checkmark-circle',tone:'gold'});
    return true;
  };
  const recordSafeCheckIn=(id:string)=>{
    if(memberDataRuntime.source==='preview'){
      setSafeCheckIns(current=>[...new Set([...current,id])]);
      return;
    }
    setAppNotice({title:'Check-in not recorded',body:'Secure date check-ins are unavailable until the live safety endpoint is connected. No check-in was created.',icon:'shield-outline',tone:'ruby'});
  };
  const reportMatch=async(match:Match,reason:string,details?:string)=>{
    const reportId=`report-${Date.now()}`;
    const result=await persistReport(profileIdFor(match),reason,details,reportId);
    if(!confirmMemberMutation(result,'Report not submitted','Your safety report could not be confirmed. Please try again.'))return false;
    setReports(current=>[...current,{id:reportId,matchId:match.id,reason,details,createdAt:Date.now()}]);
    setAppNotice({title:'Report submitted privately',body:'Your report is saved for safety review. The other member is not notified.',icon:'flag-outline',tone:'gold'});
    return true;
  };
  const blockMatch=async(match:Match)=>{
    const result=await persistBlock(profileIdFor(match));
    if(!confirmMemberMutation(result,'Member not blocked','The private block could not be confirmed. Please try again.'))return false;
    setBlockedIds(current=>[...new Set([...current,match.id])]);
    setDismissedIds(current=>[...new Set([...current,match.id])]);
    setAppNotice({title:'Blocked privately',body:`${match.name} is hidden from your matches, likes and chats. They will not be notified.`,icon:'ban-outline',tone:'ruby'});
    return true;
  };
  const unmatchMatch=async(match:Match)=>{
    const result=await persistUnmatch(conversationIdFor(match),`unmatch-${Date.now()}`);
    if(!confirmMemberMutation(result,'Could not unmatch','The relationship could not be closed securely. Please try again.'))return false;
    setDismissedIds(current=>[...new Set([...current,match.id])]);
    setAppNotice({title:'Unmatched',body:`${match.name} has been removed from your introductions and conversation flow.`,icon:'person-remove-outline',tone:'rose'});
    return true;
  };
  const sendRose=async(match:Match,note:string)=>{
    const today=todayKey();
    const available=getRoseAvailability(roseLedger);
    if(memberDataRuntime.source==='server'){
      const actionId=`golden-spark-${Date.now()}`;
      try{
        const result=await sendGoldenSpark(profileIdFor(match),note,actionId);
        const serverPaid=result.paymentSource==='paid_spark';
        setRoseLedger(current=>({dayKey:today,freeUsed:serverPaid?current.freeUsed:true,paidCredits:typeof result.balance==='number'?result.balance:current.paidCredits,sent:[...current.sent.slice(-49),{id:result.id,matchId:match.id,note,paid:serverPaid,createdAt:Date.now()}]}));
        trackDiscovery('interested',match);
        if(result.matched){appendChatMessage(match,createRoseMessage(note));setRosePopup({match,note,paid:serverPaid})}
        else setAppNotice({title:'Golden Spark sent',body:`Your intentional note was delivered privately to ${match.name}. Chat opens only after mutual interest.`,icon:'sparkles',tone:'gold'});
      }catch(error){
        setAppNotice({title:'Spark not sent',body:error instanceof Error?error.message:'The secure Spark service is unavailable. Your balance was not changed.',icon:'shield-outline',tone:'ruby'});
      }
      return;
    }
    if(!available.freeAvailable&&available.paidCredits<=0){
      setAppNotice({title:'Golden Spark pack',body:'Free plan includes 1 Golden Spark every day. Extra Sparks can be added through secure in-app purchase.',icon:'sparkles',tone:'gold',actionLabel:'See Spark packs',actionScreen:'pricing'});
      return;
    }
    const paid=!available.freeAvailable;
    setRoseLedger(current=>({dayKey:today,freeUsed:paid?current.freeUsed:true,paidCredits:paid?Math.max(0,current.paidCredits-1):current.paidCredits,sent:[...current.sent.slice(-49),{id:`rose-${Date.now()}`,matchId:match.id,note,paid,createdAt:Date.now()}]}));
    trackDiscovery('interested',match);
    void persistMatchDecision(profileIdFor(match),'interested');
    appendChatMessage(match,createRoseMessage(note));
    setRosePopup({match,note,paid});
  };
  const resetDemo=async()=>{if(memberDataRuntime.source==='server')await signOut();await Promise.all([clearAppState(),coupleModeRepository.clear()]);setCoupleMode(initialCoupleModeState);setChatLaunchTool(null);setVerified(initialPersistedState.verified);setProfileDraft(initialPersistedState.profileDraft);setVibeList(initialPersistedState.vibes);setIntent(initialPersistedState.intent);setAlignment(initialPersistedState.alignment);setChatMessages(initialPersistedState.chats);setChatDrafts({});setCoinBalance(initialPersistedState.coinBalance);setProfilePhotos(initialPersistedState.photos);setSelfieUri('');setVoiceIntroUri('');setVouches([]);setDiscoverySignals([]);setSmartDiscovery(true);setCrossedPaths(false);setBlockedIds([]);setReports([]);setSafeCheckIns([]);setMatchFilters(defaultMatchFilters);setRoseLedger(initialPersistedState.roseLedger);setLastSeenVisible(initialPersistedState.lastSeenVisible);setAnalyticsConsent(initialPersistedState.analyticsConsent);setChatSettings(initialPersistedState.chatSettings);setRelationshipReflections(initialPersistedState.relationshipReflections);setRelationshipReminders(initialPersistedState.relationshipReminders);setRosePopup(null);setAppNotice(null);setReferralOfferOpen(false);setDetailSafetyOpen(false);setDismissedIds([]);setProfileViewNotifiedIds([]);setAuthDestination('');setAuthPassword('');setOnboardingComplete(false);setScreen('welcome')};
  const deleteAccount=async()=>{try{await requestAccountDeletion()}finally{await resetDemo()}};
  return <SafeAreaProvider><StatusBar style="light"/><View style={shared.screen}>
    {screen==='splash'&&<Splash/>}
    {screen==='welcome'&&<Welcome onNext={()=>setScreen('auth')}/>} 
    {screen==='auth'&&<Auth onNext={(destination,skipOtp,password)=>{setAuthDestination(destination);setAuthPassword(password??'');if(skipOtp)setAuthenticated(true);setScreen(skipOtp?'verify':'otp')}} onBack={()=>setScreen('welcome')}/>} 
    {screen==='otp'&&<Otp destination={authDestination} password={authPassword} onBack={()=>setScreen('auth')} onVerified={()=>{setAuthenticated(true);setScreen('verify')}}/>} 
    {screen==='verify'&&<Verify verified={verified} selfieUri={selfieUri} onSelfie={setSelfieUri} setVerified={setVerified} onNext={()=>setScreen('modeSelect')}/>} 
    {screen==='modeSelect'&&<ModeSelect mode={coupleMode.experienceMode} onChange={chooseExperienceMode} onNext={()=>setScreen(coupleMode.experienceMode==='couple'?'coupleSetup':'profileSetup')}/>} 
    {screen==='coupleSetup'&&<CoupleSetup profile={profileDraft} hub={coupleHub} onBack={()=>setScreen(onboardingComplete?'profile':'modeSelect')} onSaveProfile={saveCoupleProfile} onSearch={searchCouplePartner} onRequest={requestCoupleConnection} onRespond={respondCoupleConnection} onOpenSpace={()=>setScreen('home')}/>} 
    {screen==='profileSetup'&&<ProfileSetup profile={profileDraft} onProfileChange={setProfileDraft} photos={profilePhotos} onPhotosChange={setProfilePhotos} voiceUri={voiceIntroUri} onVoiceChange={setVoiceIntroUri} onNext={()=>setScreen('vibes')}/>} 
    {screen==='vibes'&&<Vibes value={vibeList} onChange={setVibeList} onNext={()=>setScreen('intent')}/>} 
    {screen==='intent'&&<Intent value={intent} onChange={setIntent} onNext={()=>setScreen('alignment')}/>} 
    {screen==='alignment'&&<Alignment value={alignment} onChange={setAlignment} onNext={completeOnboarding}/>} 
    {screen==='home'&&(coupleMode.experienceMode==='couple'?<CoupleHome state={coupleMode} hub={coupleHub} memberName={profileDraft.firstName} city={profileDraft.city} messages={chatMessages[conversationPartner.id]??[]} onShare={shareCoupleSpace} onManage={()=>setScreen('coupleSetup')} onOpenTool={openCoupleTool} navigate={navigateTo}/>:<HomeClean items={visibleMatches} matchLoadState={matchLoadState} matchingPoolStatus={matchingPoolStatus} onRetryMatches={()=>void refreshServerMatches()} preferences={{intent,vibes:vibeList,filters:matchFilters}} alignment={alignment} signals={discoverySignals} dismissedCount={dismissedIds.length} profileGrowth={{hasPhoto:profilePhotos.length>0,verified,hasVoiceIntro:!!voiceIntroUri,vouchesCount:vouches.length,vibeCount:vibeList.length,hasIntent:!!intent}} roseAvailability={roseAvailability} crossedPaths={crossedPaths} openDetail={openDetail} onInterested={chooseInterested} onSkip={passMatch} onRose={openRose} navigate={navigateTo}/>)} 
    {screen==='explore'&&<ExploreHub navigate={navigateTo}/>} 
    {screen==='circle'&&<TrustedCircle vouches={vouches} coinBalance={coinBalance} rewardMode={vouchRewardsMode} onBack={()=>setScreen('explore')} onAddVouch={(quality)=>{if(vouchRewardsMode==='demo'&&vouches.length<3&&!vouches.includes(quality)){setVouches(current=>[...current,quality]);setCoinBalance(balance=>balance+100)}}}/>} 
    {screen==='discovery'&&<DiscoveryCenter filters={matchFilters} onFiltersChange={updateMatchFilters} signals={discoverySignals} smartDiscovery={smartDiscovery} crossedPaths={crossedPaths} onSmartChange={updateSmartDiscovery} onCrossedChange={setCrossedPaths} onClear={clearMatchingActivity} onBack={()=>setScreen('explore')}/>} 
    {screen==='coach'&&<RelationshipCoach match={selected} preferences={{intent,vibes:vibeList,filters:matchFilters}} onBack={()=>setScreen('explore')} onOpenFilters={()=>setScreen('discovery')} onUseInChat={useCoachDraftInChat} onSubmitFeedback={submitSelectedMatchFeedback}/>} 
    {screen==='events'&&<EventsHub mode={coupleMode.experienceMode} defaultCity={profileDraft.city} onBack={()=>setScreen('home')} onOpenDatePlan={(place)=>{setDatePlanPreset(place??null);navigateTo('datePlan')}} onOpenTool={openCoupleTool} navigate={navigateTo} />}
    {screen==='executive'&&<ExecutiveCircle navigate={navigateTo} onBack={()=>setScreen('explore')} onOpenEvents={()=>setScreen('events')} onOpenPricing={()=>setScreen('pricing')} onOpenVerify={()=>setScreen('verifyHub')} onOpenDatePlan={()=>setScreen('datePlan')}/>} 
    {screen==='verifyHub'&&<VerificationHub verified={verified} selfieUri={selfieUri} hasVoiceIntro={!!voiceIntroUri} vouches={vouches} onBack={()=>setScreen('profile')} onVerify={()=>{setVerified(true);setAppNotice({title:'Trust badge upgraded',body:'Selfie verification is marked complete in this preview. Production will connect liveness and ID providers.',icon:'shield-checkmark',tone:'gold'})}} onOpenSafety={()=>setScreen('safety')}/>} 
    {screen==='admin'&&<AdminModerationPanel reports={reports} blockedCount={blockedIds.length} onBack={()=>setScreen('profile')}/>} 
    {screen==='detail'&&<Detail match={selected} preferences={{intent,vibes:vibeList,filters:matchFilters}} alignment={alignment} back={()=>setScreen('home')} interested={()=>chooseInterested(selected)} onRose={()=>openRose(selected)} onProfileView={()=>notifyProfileView(selected)} onPrivateBlock={()=>setDetailSafetyOpen(true)}/>} 
    {screen==='mutual'&&<Mutual match={selected} next={()=>setScreen('icebreaker')} back={()=>setScreen('home')}/>} 
    {screen==='icebreaker'&&<Icebreaker match={selected} question={icebreakerQuestion} onSubmit={answerIcebreaker}/>} 
    {screen==='chat'&&<Chat experienceMode={coupleMode.experienceMode} initialTool={chatLaunchTool} onToolConsumed={()=>setChatLaunchTool(null)} match={conversationPartner} messages={chatMessages[conversationPartner.id]??[]} reflection={relationshipReflections[conversationPartner.id]} reminder={relationshipReminders[conversationPartner.id]} settings={{...defaultCoupleChatSettings,...chatSettings[conversationPartner.id]}} initialDraft={chatDrafts[conversationPartner.id]??''} onDraftConsumed={()=>setChatDrafts(current=>{const next={...current};delete next[conversationPartner.id];return next})} onSettingsChange={updateSelectedChatSettings} onDateStatus={(messageId,status)=>updateDatePlanStatus(conversationPartner.id,messageId,status)} onReflection={(messageId,choice)=>saveReflection(conversationPartner.id,messageId,choice)} onLearningConsent={(enabled)=>updateRelationshipLearningConsent(conversationPartner.id,enabled)} onReminder={(messageId,enabled)=>updateRelationshipReminder(conversationPartner.id,messageId,enabled)} onJourneyEvent={recordJourneyEvent} coinBalance={coinBalance} roseAvailability={roseAvailability} onRose={()=>coupleMode.experienceMode==='seeking'&&openRose(conversationPartner)} onSend={(message)=>appendChatMessage(conversationPartner,message)} onSpendCoins={(coins)=>setCoinBalance(balance=>spendCoins(balance,coins))} onReport={(reason,details)=>void reportMatch(conversationPartner,reason,details)} onBlock={async()=>{if(await blockMatch(conversationPartner))setScreen('home')}} onUnmatch={async()=>{if(await unmatchMatch(conversationPartner))setScreen('home')}} navigate={navigateTo}/>} 
    {screen==='datePlan'&&<DatePlanner match={conversationPartner} preset={datePlanPreset} onBack={()=>setScreen('events')} onSend={async(message)=>{const sent=await appendChatMessage(conversationPartner,message);if(sent)setScreen('chat');return sent}}/>}
    {screen==='safety'&&<SafetyCenter reports={reports} blockedCount={blockedIds.length} datePlans={Object.values(chatMessages).flat().filter(message=>message.type==='date')} safeCheckIns={safeCheckIns} onCheckIn={recordSafeCheckIn} onDeleteAccount={deleteAccount} onBack={()=>setScreen('profile')}/>} 
    {screen==='likes'&&<Likes openPricing={()=>setScreen('pricing')} navigate={navigateTo}/>} 
    {screen==='profile'&&<Profile experienceMode={coupleMode.experienceMode} connectionStatus={coupleMode.connection.status} partnerName={coupleMode.connection.partner?.displayName} onModeChange={(mode)=>{chooseExperienceMode(mode);setScreen(mode==='couple'?'coupleSetup':'home')}} onOpenTool={openCoupleTool} profile={profileDraft} verified={verified} profilePhoto={profilePhotos[0]} hasVoiceIntro={!!voiceIntroUri} lastSeenVisible={lastSeenVisible} analyticsConsent={analyticsConsent} onLastSeenVisibleChange={updateLastSeenPrivacy} onAnalyticsConsentChange={updateAnalyticsPrivacy} onInvite={()=>setReferralOfferOpen(true)} navigate={navigateTo} onReset={resetDemo}/>} 
    {screen==='support'&&<SupportCenter onBack={()=>setScreen('profile')}/>} 
    {screen==='pricing'&&<Pricing back={()=>setScreen('profile')} onInvite={()=>setReferralOfferOpen(true)} onBuyRoses={(amount=5)=>{setRoseLedger(current=>({...current,paidCredits:current.paidCredits+amount}));setAppNotice({title:'Spark pack added',body:`Preview pack added ${amount} Golden Sparks. Production uses Apple/Google in-app billing and restore purchase.`,icon:'sparkles',tone:'gold'})}}/>} 
    <RoseComposer visible={!!roseTarget} recipientName={roseTarget?.name??''} availability={roseAvailability} onClose={()=>setRoseTarget(null)} onSend={(note)=>{if(roseTarget)void sendRose(roseTarget,note);setRoseTarget(null)}}/>
    <RoseReceivedPopup data={rosePopup} onClose={()=>setRosePopup(null)} onOpenChat={(match)=>{setSelected(match);setRosePopup(null);setScreen('chat')}}/>
    <SafetyActions visible={detailSafetyOpen} match={selected} onClose={()=>setDetailSafetyOpen(false)} onSafetyCenter={()=>{setDetailSafetyOpen(false);setScreen('safety')}} onReport={async(reason,details)=>{setDetailSafetyOpen(false);if(await reportMatch(selected,reason,details))setAppNotice({title:'Report submitted privately',body:'Your report is saved for safety review. The other member is not notified.',icon:'flag-outline',tone:'gold'})}} onBlock={async()=>{setDetailSafetyOpen(false);if(await blockMatch(selected)){setScreen('home');setAppNotice({title:'Blocked privately',body:`${selected.name} is hidden from your matches, likes and chats. They will not be notified.`,icon:'ban-outline',tone:'ruby'})}}} onUnmatch={async()=>{setDetailSafetyOpen(false);if(await unmatchMatch(selected)){setScreen('home');setAppNotice({title:'Unmatched',body:`${selected.name} has been removed from your introductions and conversation flow.`,icon:'person-remove-outline',tone:'rose'})}}}/>
    <AppNoticeSheet notice={appNotice} onClose={()=>setAppNotice(null)} onAction={(nextScreen)=>{setAppNotice(null);navigateTo(nextScreen)}}/>
    <ReferralWelcomeOffer visible={referralOfferOpen} referralCode={referralCode} onClose={()=>setReferralOfferOpen(false)} onViewPlans={()=>{setReferralOfferOpen(false);setScreen('pricing')}}/>
  </View></SafeAreaProvider>
}

export default function App() {
  const app=<ErrorBoundary><DestinyOneApp/></ErrorBoundary>;
  if(Platform.OS==='web'||!stripePublishableKey)return app;
  return <StripePaymentProvider publishableKey={stripePublishableKey} merchantIdentifier="merchant.com.destinyone.app">{app}</StripePaymentProvider>;
}

function Splash(){
  const pulse=useRef(new Animated.Value(0)).current;
  const progress=useRef(new Animated.Value(0)).current;
  const float=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    const loop=Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1,duration:900,easing:Easing.inOut(Easing.ease),useNativeDriver:Platform.OS!=='web'}),
      Animated.timing(pulse,{toValue:0,duration:900,easing:Easing.inOut(Easing.ease),useNativeDriver:Platform.OS!=='web'}),
    ]));
    loop.start();
    Animated.timing(progress,{toValue:1,duration:3000,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS!=='web'}).start();
    const floatLoop=Animated.loop(Animated.sequence([
      Animated.timing(float,{toValue:1,duration:1400,easing:Easing.inOut(Easing.sin),useNativeDriver:Platform.OS!=='web'}),
      Animated.timing(float,{toValue:0,duration:1400,easing:Easing.inOut(Easing.sin),useNativeDriver:Platform.OS!=='web'}),
    ]));
    floatLoop.start();
    return()=>{loop.stop();floatLoop.stop()};
  },[progress,pulse,float]);
  const scale=pulse.interpolate({inputRange:[0,1],outputRange:[.98,1.055]});
  const glowOpacity=pulse.interpolate({inputRange:[0,1],outputRange:[.24,.5]});
  const translateY=float.interpolate({inputRange:[0,1],outputRange:[3,-4]});
  const wordsOpacity=progress.interpolate({inputRange:[0,.16,.85,1],outputRange:[0,1,1,.92]});
  const wordsY=progress.interpolate({inputRange:[0,1],outputRange:[10,0]});
  return <LinearGradient colors={['#FFFDFC','#F8EFE8','#F3E3E0']} locations={[0,.56,1]} style={styles.center}>
    <View style={launchStyles.velvetGlowTop}/><View style={launchStyles.velvetGlowBottom}/>
    <Animated.View style={[launchStyles.cleanHalo,{opacity:glowOpacity,transform:[{scale}]}]}/>
    <Animated.View style={[launchStyles.logoFrame,{transform:[{translateY},{scale}]}]}>
      <LinearGradient colors={['#FFFFFF','#D4AF37','#9E001E']} style={launchStyles.logoRing}>
        <View style={launchStyles.logoWell}><Image source={destinyOneLogo} resizeMode="contain" style={launchStyles.preloadLogo}/></View>
      </LinearGradient>
    </Animated.View>
    <Text style={launchStyles.preloadBrand}>Destiny<Text style={launchStyles.preloadBrandOne}>One</Text></Text>
    <Text style={[styles.tagline,launchStyles.script]}>For something real.</Text>
    <Animated.Text style={[launchStyles.preloadLine,{opacity:wordsOpacity,transform:[{translateY:wordsY}]}]}>Slow down. Choose better. Meet with intention.</Animated.Text>
    <Text style={launchStyles.preloadMood}>Serious dating, curated softly.</Text>
    <View style={launchStyles.preloadPromise}><View style={launchStyles.promiseDot}/><Text style={launchStyles.preloadPromiseText}>VERIFIED</Text><View style={launchStyles.promiseDot}/><Text style={launchStyles.preloadPromiseText}>PRIVATE</Text><View style={launchStyles.promiseDot}/><Text style={launchStyles.preloadPromiseText}>INTENTIONAL</Text></View>
    <View style={launchStyles.preloadTrack}><Animated.View style={[launchStyles.preloadFill,{transform:[{scaleX:progress}]}]}/></View>
    <Text style={styles.fine}>OPENING DESTINYONE</Text>
  </LinearGradient>
}

function Welcome({onNext}:{onNext:()=>void}){return <LinearGradient colors={['#FFFDFC','#F7EDEA','#F2E2E1']} locations={[0,.58,1]} style={{flex:1}}><View style={styles.welcomeGlowOne}/><View style={styles.welcomeGlowTwo}/><SafeAreaView style={shared.safe}><View style={styles.welcomeTop}><Brand small/><View style={styles.memberPill}><View style={styles.memberDot}/><Text style={styles.memberText}>For something real</Text></View></View><View style={styles.welcomeArt}><View style={styles.orbit}/><View style={styles.sparkOne}><MiniPremiumIcon name="sparkles" tone="rose" size={32} iconSize={15}/></View><View style={[styles.photoMini,{transform:[{rotate:'-8deg'}],left:25}]}><Image source={{uri:matches[1]!.photo}} style={styles.fill}/></View><View style={[styles.photoMini,{transform:[{rotate:'8deg'}],right:25,top:55}]}><Image source={{uri:matches[0]!.photo}} style={styles.fill}/></View><View style={styles.heart}><PremiumIcon name="heart" tone="ruby" size={54} iconSize={26}/></View><View style={styles.valueTag}><MiniPremiumIcon name="heart" tone="ruby" size={24} iconSize={11}/><Text style={styles.valueTagText}>Family first</Text></View></View><View style={{gap:14}}><SectionTitle eyebrow="SERIOUS STARTS HERE" title="Meet someone who means it." body="Intentional South Asian dating across the USA and Canada."/><View style={launchStyles.trustRibbon}><TrustPoint icon="shield-checkmark" label="Verified"/><TrustPoint icon="heart" label="Intentional"/><TrustPoint icon="lock-closed" label="Private"/></View><View style={{gap:10,marginTop:4}}><Button label="Start with intention" icon="arrow-forward" onPress={onNext}/><Button variant="ghost" label="I already have an account" onPress={onNext}/></View></View></SafeAreaView></LinearGradient>}

function TrustPoint({icon,label}:{icon:keyof typeof Ionicons.glyphMap;label:string}){return <View style={launchStyles.trustPoint}><PremiumIcon name={icon} tone={label==='Private'?'dark':label==='Verified'?'gold':'ruby'} size={24} iconSize={12}/><Text style={launchStyles.trustLabel}>{label}</Text></View>}

function RoseMark({size=34}:{size?:number}){
  return <Image source={premiumRose} resizeMode="cover" style={{width:size,height:size,borderRadius:size/2,borderWidth:1,borderColor:'rgba(255,255,255,.22)'}}/>;
}

type PremiumIconTone='ruby'|'gold'|'plum'|'rose'|'dark';
const premiumIconPalettes:Record<PremiumIconTone,{colors:[string,string,string];glow:string;icon:string}>={
  ruby:{colors:['#C91638','#7B0D20','#1A0307'],glow:'rgba(229,9,47,.50)',icon:'#FFF8F4'},
  gold:{colors:['#E8C76A','#A77E19','#2A1D07'],glow:'rgba(212,175,55,.42)',icon:'#1B0905'},
  plum:{colors:['#5E28A8','#351149','#120018'],glow:'rgba(122,31,224,.42)',icon:'#FFF8F4'},
  rose:{colors:['#E55A70','#A50D2B','#27040B'],glow:'rgba(255,110,128,.38)',icon:'#FFF8F4'},
  dark:{colors:['#FFFDFC','#E7D8CC','#9F8171'],glow:'rgba(87,52,42,.16)',icon:'#5A3338'},
};

function PremiumIcon({name,tone='ruby',size=44,iconSize=20}:{name:keyof typeof Ionicons.glyphMap;tone?:PremiumIconTone;size?:number;iconSize?:number}){
  const palette=premiumIconPalettes[tone];
  return <LinearGradient colors={palette.colors} start={{x:0,y:0}} end={{x:1,y:1}} style={[premiumIconStyles.frame,{width:size,height:size,borderRadius:size/2,shadowColor:palette.glow}]}>
    <View style={[premiumIconStyles.inner,{borderRadius:size/2-2}]}/>
    <View style={premiumIconStyles.shine}/>
    <Ionicons name={name} size={iconSize} color={palette.icon}/>
  </LinearGradient>
}

function MiniPremiumIcon({name,tone='ruby',size=30,iconSize=14}:{name:keyof typeof Ionicons.glyphMap;tone?:PremiumIconTone;size?:number;iconSize?:number}){
  return <PremiumIcon name={name} tone={tone} size={size} iconSize={iconSize}/>
}

function Auth({onNext,onBack}:{onNext:(destination:string,skipOtp?:boolean,password?:string)=>void;onBack:()=>void}) {
  const [mode,setMode]=useState<'phone'|'email'>('phone');
  const [phone,setPhone]=useState('+1');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [submitted,setSubmitted]=useState(false);
  const [authError,setAuthError]=useState('');
  const [socialStatus,setSocialStatus]=useState('');
  const [loading,setLoading]=useState(false);
  const phoneValid=isValidPhone(phone);
  const emailValid=isValidEmail(email);
  const passwordValid=isValidPassword(password);
  const valid=mode==='phone'?phoneValid:emailValid&&passwordValid;
  const submit=async()=>{setSubmitted(true);setAuthError('');setSocialStatus('');if(!valid)return;setLoading(true);try{if(mode==='phone'){await beginAuthentication({mode:'phone',phone});onNext(phone,allowsPreviewAuthBypass)}else{const cleanEmail=email.trim().toLowerCase();await beginAuthentication({mode:'email',email:cleanEmail,password});onNext(cleanEmail,allowsPreviewAuthBypass,password)}}catch(error){setAuthError(error instanceof Error?error.message:'Could not create your account. Please try again.')}finally{setLoading(false)}};
  const switchMode=(next:'phone'|'email')=>{setMode(next);setSubmitted(false);setAuthError('');setSocialStatus('')};
  const socialLogin=(provider:'Apple'|'Google'|'LinkedIn')=>{
    setLoading(true);
    setAuthError('');
    setSocialStatus(`Continuing securely with ${provider}…`);
    setTimeout(()=>{setLoading(false);onNext(`${provider.toLowerCase()}@destinyone.preview`,true)},450);
  };

  return <FormPage back={onBack} step={1}>
    <SectionTitle eyebrow="YOUR INVITE" title="Let’s make this yours." body="Start with your phone, email, or a trusted account."/>
    <View style={authStyles.socialGrid}>
      <Pressable accessibilityRole="button" accessibilityLabel="Continue with Apple" disabled={loading} onPress={()=>socialLogin('Apple')} style={authStyles.socialButton}><MiniPremiumIcon name="logo-apple" tone="dark" size={31} iconSize={15}/><Text style={authStyles.socialText}>Apple</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" disabled={loading} onPress={()=>socialLogin('Google')} style={authStyles.socialButton}><MiniPremiumIcon name="logo-google" tone="ruby" size={31} iconSize={15}/><Text style={authStyles.socialText}>Google</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Continue with LinkedIn" disabled={loading} onPress={()=>socialLogin('LinkedIn')} style={authStyles.socialButton}><MiniPremiumIcon name="logo-linkedin" tone="plum" size={31} iconSize={15}/><Text style={authStyles.socialText}>LinkedIn</Text></Pressable>
    </View>
    {!!socialStatus&&<View style={authStyles.socialStatus}><MiniPremiumIcon name="shield-checkmark" tone="gold" size={30} iconSize={14}/><Text style={authStyles.socialStatusText}>{socialStatus}</Text></View>}
    <View style={authStyles.orRow}><View style={authStyles.orLine}/><Text style={authStyles.orText}>or continue with</Text><View style={authStyles.orLine}/></View>
    <View style={styles.segment}>
      <Segment label="Phone" active={mode==='phone'} onPress={()=>switchMode('phone')}/>
      <Segment label="Email" active={mode==='email'} onPress={()=>switchMode('email')}/>
    </View>
    <View style={{gap:16}}>
      {mode==='phone'?<>
        <Field label="Phone number" placeholder="+1  (555)  000-0000" keyboardType="phone-pad" value={phone} onChangeText={setPhone} error={submitted&&!phoneValid?'Enter a valid 10-digit phone number.':''}/>
        <Text style={styles.helper}>{allowsPreviewAuthBypass?'Preview access is enabled. Verification is temporarily paused.':'We’ll text you a one-time code. Your number stays private.'}</Text>
      </>:<>
        <Field label="Email address" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} error={submitted&&!emailValid?'Enter a valid email address.':''}/>
        <Field label="Password" placeholder="10+ characters" secureTextEntry value={password} onChangeText={setPassword} error={submitted&&!passwordValid?'Use 10+ characters with uppercase, lowercase, and a number.':''}/>
        <Text style={styles.helper}>{allowsPreviewAuthBypass?'Preview access is enabled. Verification is temporarily paused.':'We’ll send a quick code before your profile opens.'}</Text>
      </>}
    </View>
    <View style={shared.spacer}/>
    {!!authError&&<Text style={styles.formError}>{authError}</Text>}
    <Button disabled={loading} label={loading?'Please wait…':allowsPreviewAuthBypass?'Enter preview':mode==='phone'?'Send verification code':'Send email verification code'} onPress={()=>void submit()}/>
    <Text style={styles.legal}>By continuing, you agree to our Terms and Privacy Policy.</Text>
  </FormPage>
}

function Otp({destination,password,onBack,onVerified}:{destination:string;password?:string;onBack:()=>void;onVerified:()=>void}) {
  const [code,setCode]=useState('');
  const [error,setError]=useState('');
  const [seconds,setSeconds]=useState(30);
  const [loading,setLoading]=useState(false);
  useEffect(()=>{if(seconds<=0)return;const timer=setInterval(()=>setSeconds(x=>x-1),1000);return()=>clearInterval(timer)},[seconds]);
  const masked=destination.includes('@')?destination.replace(/^(.{2}).*(@.*)$/,'$1••••$2'):`••• ••• ${destination.replace(/\D/g,'').slice(-4)}`;
  const isEmail=destination.includes('@');
  const allowPreviewCode=!isEmail&&(backendMode==='demo'||allowsPreviewOtpFallback);
  const verify=async()=>{setLoading(true);setError('');try{const valid=await verifyAuthentication(destination,code,password);if(valid)onVerified();else setError('That code doesn’t match. Check the six digits and try again.')}catch(error){setError(error instanceof Error?error.message:'Verification failed. Please try again.')}finally{setLoading(false)}};
  const resend=async()=>{setSeconds(30);setCode('');setError('');try{if(isEmail){await beginAuthentication({mode:'email',email:destination,password:password??''})}else{await beginAuthentication({mode:'phone',phone:destination})}}catch(error){setError(error instanceof Error?error.message:'Could not resend the code.')}};

  return <FormPage back={onBack}>
    <SectionTitle eyebrow="ONE QUICK CHECK" title="Enter the code." body={`Sent to ${masked}`}/>
    <View style={{gap:12}}>
      <TextInput autoFocus value={code} onChangeText={value=>{setCode(value.replace(/\D/g,'').slice(0,6));setError('')}} keyboardType="number-pad" maxLength={6} placeholder="000000" placeholderTextColor="#554E5B" style={[styles.otpInput,error&&{borderColor:colors.danger}]}/>
      {error?<Text style={styles.formError}>{error}</Text>:allowPreviewCode?<Text style={styles.demoHint}>Showcase access code: 123456</Text>:<Text style={styles.helper}>Use the newest code from your {isEmail?'email':'messages'}.</Text>}
    </View>
    <Pressable disabled={seconds>0} onPress={()=>void resend()} style={styles.resend}>
      <Text style={[styles.resendText,seconds>0&&{color:colors.muted}]}>{seconds>0?`Resend code in 0:${String(seconds).padStart(2,'0')}`:'Resend verification code'}</Text>
    </Pressable>
    <View style={[shared.card,{flexDirection:'row',gap:12,alignItems:'center'}]}>
      <MiniPremiumIcon name="lock-closed-outline" tone="gold" size={36} iconSize={17}/>
      <Text style={[styles.helper,{flex:1}]}>Your contact details never appear on your profile.</Text>
    </View>
    <View style={shared.spacer}/>
    <Button label={loading?'Verifying…':'Verify and continue'} disabled={code.length!==6||loading} onPress={()=>void verify()}/>
  </FormPage>
}

function Verify({verified,selfieUri,onSelfie,setVerified,onNext}:{verified:boolean;selfieUri:string;onSelfie:(uri:string)=>void;setVerified:(x:boolean)=>void;onNext:()=>void}) {
  const preview=memberDataRuntime.source==='preview';
  const [error,setError]=useState('');
  const [idUri,setIdUri]=useState('');
  const pickVerificationPhoto=async()=>{
    setError('');
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){setError('Photo library permission is needed to add a verification photo.');return}
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.8});
    if(!result.canceled&&result.assets[0]){onSelfie(result.assets[0].uri);if(preview)setVerified(true)}
  };
  const captureSelfie=async()=>{
    setError('');
    const permission=await ImagePicker.requestCameraPermissionsAsync();
    if(!permission.granted){setError('Camera permission is needed for selfie verification.');return}
    const result=await ImagePicker.launchCameraAsync({mediaTypes:['images'],cameraType:ImagePicker.CameraType.front,allowsEditing:true,aspect:[1,1],quality:.8});
    if(!result.canceled&&result.assets[0]){onSelfie(result.assets[0].uri);if(preview)setVerified(true)}
  };
  const pickGovernmentId=async()=>{
    setError('');
    if(!preview){setError('Secure ID verification is not connected yet. No identity document was selected or stored.');return}
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){setError('Photo library permission is needed to add an optional ID.');return}
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,quality:.8});
    if(!result.canceled&&result.assets[0])setIdUri(result.assets[0].uri);
  };
  return <FormPage step={2}>
    <SectionTitle eyebrow="REAL PEOPLE. REAL INTENT." title="One selfie. More trust." body="A quick private check keeps fake profiles out and genuine people in."/>
    <LinearGradient colors={verified?['rgba(212,175,55,.14)','rgba(55,10,19,.96)']:['rgba(229,9,47,.12)','rgba(31,7,13,.96)']} style={verificationStyles.card}>
      <View style={verificationStyles.glow}/>
      <View style={styles.selfie}>{selfieUri?<Image source={{uri:selfieUri}} style={mediaStyles.selfieImage}/>:<PremiumIcon name={verified?'shield-checkmark':'scan-outline'} tone={verified?'gold':'plum'} size={64} iconSize={29}/>} {verified&&<View style={mediaStyles.selfieCheck}><MiniPremiumIcon name="checkmark" tone="gold" size={27} iconSize={13}/></View>}</View>
      <View style={verificationStyles.statusPill}><Ionicons name={verified?'checkmark-circle':'lock-closed'} size={13} color={verified?colors.gold:colors.pinkSoft}/><Text style={verificationStyles.statusText}>{verified?'TRUST BADGE ACTIVE':'PRIVATE CHECK'}</Text></View>
      <Text style={verificationStyles.title}>{verified?'Verified looks good on you.':selfieUri&&!preview?'Your selfie is in review.':'Let’s make it official.'}</Text>
      <Text style={verificationStyles.body}>{verified?'Your trust badge is live. Your selfie stays private.':selfieUri&&!preview?'Your selfie is being reviewed privately. Your badge appears after approval.':'Choose a recent solo photo. It will never appear on your profile.'}</Text>
      <View style={{width:'100%',gap:10}}>
        <Button variant={verified?'gold':'secondary'} label={verified?'Update my selfie':'Choose a selfie'} onPress={pickVerificationPhoto} icon="images"/>
        <Button variant="ghost" label="Take one now" onPress={captureSelfie} icon="camera-outline"/>
      </View>
      {!!error&&<Text style={styles.formError}>{error}</Text>}
    </LinearGradient>
    <Pressable onPress={()=>void pickGovernmentId()} style={[styles.upload,verificationStyles.idCard]}><MiniPremiumIcon name={idUri?'checkmark-circle':'id-card-outline'} tone={idUri?'gold':'dark'} size={38} iconSize={18}/><View style={{flex:1}}><Text style={shared.label}>{idUri?'Extra trust added':preview?'Want a stronger trust signal?':'Strengthen your trust badge'}</Text><Text style={styles.helper}>{idUri?'Your ID was added privately':preview?'Add an ID privately. Totally optional.':'Available through secure ID verification'}</Text></View><MiniPremiumIcon name={idUri?'checkmark':'chevron-forward'} tone={idUri?'gold':'dark'} size={30} iconSize={14}/></Pressable>
    <View style={shared.spacer}/><Button label={selfieUri&&!verified&&!preview?'Continue while we review':'Keep going'} disabled={preview?!verified:!selfieUri} onPress={onNext}/>
  </FormPage>
}

function ModeSelect({mode,onChange,onNext}:{mode:ExperienceMode;onChange:(mode:ExperienceMode)=>void;onNext:()=>void}){
  const options=[
    {mode:'seeking' as const,tag:'I’M SINGLE',title:'I want to meet someone',body:'See serious matches and start a relationship.',icon:'heart-outline' as const,tone:'ruby' as const,points:['5 matches each day','See shared values','Chat after you both like each other']},
    {mode:'couple' as const,tag:'I HAVE A PARTNER',title:'Use DestinyOne with my partner',body:'Connect with your partner and enjoy the app together.',icon:'heart-circle-outline' as const,tone:'gold' as const,points:['No new matches','Only you and your partner','Chat, plan dates, send gifts and play games']},
  ];
  return <FormPage step={3}>
    <SectionTitle eyebrow="CHOOSE HOW YOU’LL USE DESTINYONE" title="Are you single or already in a relationship?" body="Choose one. You can change it later."/>
    <View style={coupleModeStyles.modeGrid}>{options.map(option=><Pressable accessibilityRole="radio" accessibilityState={{checked:mode===option.mode}} key={option.mode} onPress={()=>onChange(option.mode)} style={[coupleModeStyles.modeCard,mode===option.mode&&coupleModeStyles.modeCardOn]}>
      <View style={shared.row}><PremiumIcon name={option.icon} tone={mode===option.mode?'gold':option.tone} size={50} iconSize={23}/><View style={{flex:1,marginLeft:12}}><Text style={coupleModeStyles.modeTag}>{option.tag}</Text><Text style={coupleModeStyles.modeTitle}>{option.title}</Text><Text style={styles.helper}>{option.body}</Text></View><MiniPremiumIcon name={mode===option.mode?'checkmark-circle':'ellipse-outline'} tone={mode===option.mode?'gold':'dark'} size={32} iconSize={15}/></View>
      <View style={coupleModeStyles.modePoints}>{option.points.map(point=><View key={point} style={[coupleModeStyles.modePoint,mode===option.mode&&coupleModeStyles.modePointOn]}><Ionicons name="checkmark" size={12} color={mode===option.mode?colors.gold:colors.pinkSoft}/><Text style={coupleModeStyles.modePointText}>{point}</Text></View>)}</View>
    </Pressable>)}</View>
    <View style={coupleModeStyles.modePromise}><MiniPremiumIcon name="lock-closed-outline" tone="rose" size={34} iconSize={16}/><Text style={[styles.helper,{flex:1}]}>You can change this later in Profile. New matches stay off when you use Couple Mode.</Text></View>
    <View style={shared.spacer}/><Button label={mode==='couple'?'Continue with my partner':'Continue to matches'} icon="arrow-forward" variant={mode==='couple'?'gold':'primary'} onPress={onNext}/>
  </FormPage>
}

function CoupleSetup({profile,hub,onSaveProfile,onSearch,onRequest,onRespond,onOpenSpace,onBack}:{profile:ProfileDraft;hub:CoupleConnectionHub;onSaveProfile:(input:{firstName:string;age:string;city:string;profession:string})=>Promise<void>;onSearch:(phone:string)=>Promise<CouplePartnerSummary>;onRequest:(member:CouplePartnerSummary)=>Promise<unknown>;onRespond:(requestId:string,accept:boolean)=>Promise<void>;onOpenSpace:()=>void;onBack:()=>void}){
  const [memberName,setMemberName]=useState(profile.firstName);
  const [age,setAge]=useState(profile.age);
  const [city,setCity]=useState(profile.city);
  const [profession,setProfession]=useState(profile.profession);
  const [profileEnabled,setProfileEnabled]=useState(false);
  const [phone,setPhone]=useState('');
  const [result,setResult]=useState<CouplePartnerSummary|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [status,setStatus]=useState('');
  const profileReady=memberName.trim().length>=2&&Number(age)>=18&&city.trim().length>=2&&profession.trim().length>=2;
  const saveProfile=async()=>{setBusy(true);setError('');try{await onSaveProfile({firstName:memberName,age,city,profession});setProfileEnabled(true);setStatus('Details saved. Now enter your partner’s phone number below.')}catch(value){setError(value instanceof Error?value.message:'Could not save your details.')}finally{setBusy(false)}};
  const search=async()=>{setBusy(true);setError('');setStatus('');setResult(null);try{setResult(await onSearch(phone))}catch(value){setError(value instanceof Error?value.message:'We could not find a Couple Mode account with that phone number.')}finally{setBusy(false)}};
  const sendRequest=async()=>{if(!result)return;setBusy(true);setError('');try{await onRequest(result);setResult(null);setStatus(`Request sent privately to ${result.displayName}. It expires in 7 days.`)}catch(value){setError(value instanceof Error?value.message:'Could not send the connection request.')}finally{setBusy(false)}};
  const respond=async(requestId:string,accept:boolean)=>{setBusy(true);setError('');try{await onRespond(requestId,accept);setStatus(accept?'Couple space connected.':'Request declined privately.')}catch(value){setError(value instanceof Error?value.message:'Could not update the request.')}finally{setBusy(false)}};
  if(hub.connection)return <FormPage back={onBack}><View style={coupleModeStyles.setupHero}><PremiumIcon name="heart-circle" tone="gold" size={64} iconSize={30}/><Text style={styles.kicker}>CONNECTED</Text><Text style={[shared.h1,{textAlign:'center'}]}>You found each other.</Text><Text style={[shared.body,{textAlign:'center'}]}>Your private space with {hub.connection.partnerDisplayName} is ready. Matching stays off.</Text></View><View style={shared.spacer}/><Button label="Open our Couple Space" icon="heart" variant="gold" onPress={onOpenSpace}/></FormPage>;
  return <FormPage back={onBack}>
    <View style={coupleModeStyles.setupHero}><PremiumIcon name="people-circle" tone="gold" size={64} iconSize={30}/><Text style={styles.kicker}>CONNECT WITH YOUR PARTNER</Text><Text style={[shared.h1,{textAlign:'center'}]}>Find your partner on DestinyOne</Text><Text style={[shared.body,{textAlign:'center'}]}>Both of you need a DestinyOne account. Save your details, then search the phone number your partner uses to log in.</Text></View>
    <View style={coupleModeStyles.profileSetupCard}><View style={shared.row}><MiniPremiumIcon name={profileEnabled?'checkmark-circle':'person-circle-outline'} tone={profileEnabled?'gold':'rose'} size={38} iconSize={18}/><View style={{flex:1,marginLeft:9}}><Text style={styles.cardTitle}>Step 1 of 2 · Your details</Text><Text style={styles.helper}>Your partner will see these details with your request.</Text></View></View><View style={coupleModeStyles.setupFields}><Field label="Name" placeholder="Your first name" value={memberName} onChangeText={setMemberName}/><View style={styles.twoCol}><View style={{flex:1}}><Field label="Age" placeholder="30" keyboardType="number-pad" value={age} onChangeText={setAge}/></View><View style={{flex:1}}><Field label="City" placeholder="Toronto, ON" value={city} onChangeText={setCity}/></View></View><Field label="Job" placeholder="For example: Engineer" value={profession} onChangeText={setProfession}/></View><Button disabled={!profileReady||busy} label={profileEnabled?'Details saved':busy?'Saving…':'Save my details'} icon={profileEnabled?'checkmark-circle':'shield-checkmark-outline'} variant={profileEnabled?'secondary':'gold'} onPress={()=>void saveProfile()}/></View>
    {profileEnabled&&<View style={coupleModeStyles.phoneSearchCard}><View style={shared.row}><PremiumIcon name="search" tone="ruby" size={46} iconSize={21}/><View style={{flex:1,marginLeft:10}}><Text style={styles.cardTitle}>Step 2 of 2 · Find your partner</Text><Text style={styles.helper}>Enter the phone number they use to log in, including the country code.</Text></View></View><Field label="Partner’s phone number" placeholder="+1 647 555 0198" keyboardType="phone-pad" value={phone} onChangeText={(value:string)=>{setPhone(value);setResult(null);setError('')}}/><Button disabled={busy||phone.trim().length<8} label={busy?'Searching…':'Search for my partner'} icon="search" onPress={()=>void search()}/></View>}
    {!!result&&<View style={coupleModeStyles.partnerResult}><View style={coupleModeStyles.partnerInitial}><Text style={coupleModeStyles.partnerInitialText}>{result.displayName[0]?.toUpperCase()}</Text></View><View style={{flex:1}}><View style={shared.row}><Text style={coupleModeStyles.partnerName}>{result.displayName}</Text>{result.verified&&<MiniPremiumIcon name="shield-checkmark" tone="gold" size={27} iconSize={13}/>}</View><Text style={styles.helper}>{result.profession} · {result.city}</Text><Text style={coupleModeStyles.phoneVerified}>Verified phone account</Text></View><Button disabled={busy} label="Send connection request" icon="paper-plane-outline" variant="gold" onPress={()=>void sendRequest()}/></View>}
    {hub.outgoingRequests.map(request=><View key={request.requestId} style={coupleModeStyles.requestCard}><MiniPremiumIcon name="time-outline" tone="gold" size={38} iconSize={18}/><View style={{flex:1}}><Text style={styles.cardTitle}>Request sent to {request.member.displayName}</Text><Text style={styles.helper}>Waiting for them to accept. Your couple space will open after that.</Text></View><View style={coupleModeStyles.pendingPill}><Text style={coupleModeStyles.pendingText}>WAITING</Text></View></View>)}
    {hub.incomingRequests.length>0&&<View style={{gap:10}}><Text style={styles.sectionLabel}>CONNECTION REQUESTS</Text>{hub.incomingRequests.map(request=><View key={request.requestId} style={coupleModeStyles.incomingCard}><View style={shared.row}><View style={coupleModeStyles.partnerInitial}><Text style={coupleModeStyles.partnerInitialText}>{request.member.displayName[0]?.toUpperCase()}</Text></View><View style={{flex:1,marginLeft:10}}><Text style={styles.cardTitle}>{request.member.displayName}</Text><Text style={styles.helper}>{request.member.profession} · {request.member.city}</Text></View><MiniPremiumIcon name="shield-checkmark" tone="gold" size={30} iconSize={14}/></View><Text style={styles.helper}>Only accept if you personally know this person and expected their request.</Text><View style={styles.twoCol}><View style={{flex:1}}><Button disabled={busy} label="Decline" variant="secondary" onPress={()=>void respond(request.requestId,false)}/></View><View style={{flex:1}}><Button disabled={busy} label="Accept" icon="checkmark" variant="gold" onPress={()=>void respond(request.requestId,true)}/></View></View></View>)}</View>}
    {!!error&&<View style={coupleModeStyles.errorCard}><MiniPremiumIcon name="alert-circle-outline" tone="ruby" size={30} iconSize={14}/><Text style={[styles.formError,{flex:1,textAlign:'left'}]}>{error}</Text></View>}
    {!!status&&<View style={coupleModeStyles.successCard}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={30} iconSize={14}/><Text style={[styles.helper,{flex:1,color:'#F3DFA7'}]}>{status}</Text></View>}
    <View style={coupleModeStyles.privateList}>{[
      ['key-outline','Search uses their phone number','You cannot search by name.'],
      ['eye-off-outline','Phone numbers stay hidden','Neither phone number is shown to the other person.'],
      ['shield-checkmark-outline','Both people must agree','Your couple space opens only after your partner accepts.'],
    ].map(([icon,title,body])=><View key={title} style={coupleModeStyles.privateRow}><MiniPremiumIcon name={icon as keyof typeof Ionicons.glyphMap} tone="rose" size={34} iconSize={16}/><View style={{flex:1}}><Text style={coupleModeStyles.privateTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View></View>)}</View>
    <Text style={styles.legal}>For safety, searches use the full phone number and are limited.</Text>
  </FormPage>
}

type ProfilePickerKind='age'|'height'|'profession'|'community';
type RegionOption={code:string;name:string};
type CityOption={id:string|number;name:string};

const profileAgeOptions=Array.from({length:33},(_,index)=>String(index+18));
const profileHeightOptions=Array.from({length:29},(_,index)=>{
  const totalInches=index+56;
  return `${Math.floor(totalInches/12)} ft ${totalInches%12} in`;
});
const profileProfessionOptions=[
  'Accountant','Architect','Artist','Attorney / Lawyer','Banking professional','Business owner','Consultant','Content creator','Data analyst','Data scientist','Dentist','Designer','Doctor / Physician','Educator / Teacher','Engineer','Entrepreneur / Founder','Finance professional','Government / Public service','Healthcare professional','Hospitality professional','Human resources','Marketing professional','Nurse','Operations professional','Pharmacist','Photographer','Product manager','Professor / Researcher','Project manager','Real estate professional','Sales professional','Small business owner','Social worker','Software engineer','Student','Therapist / Counsellor','Writer / Editor','Other',
];
const profileCommunityOptions=[
  'Punjabi','Gujarati','Tamil','Telugu','Bengali','Marathi','Malayali','Kannada','Sindhi','Rajasthani','Kashmiri','Assamese','Odia','Bhojpuri','Haryanvi','Himachali','Uttarakhandi','Goan','Nepali','Sri Lankan Tamil','Pakistani Punjabi','Pakistani','Bangladeshi','Indo-Caribbean','Mixed South Asian','South Asian + another culture','Prefer not to say','Other',
];
const makeRegionOptions=(entries:readonly (readonly [string,string])[]):RegionOption[]=>entries.map(([code,name])=>({code,name}));
const northAmericaRegions:Record<'US'|'CA',RegionOption[]>={
  US:makeRegionOptions([
    ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],['PR','Puerto Rico'],['GU','Guam'],['VI','U.S. Virgin Islands'],['AS','American Samoa'],['MP','Northern Mariana Islands'],
  ]),
  CA:makeRegionOptions([
    ['AB','Alberta'],['BC','British Columbia'],['MB','Manitoba'],['NB','New Brunswick'],['NL','Newfoundland and Labrador'],['NS','Nova Scotia'],['NT','Northwest Territories'],['NU','Nunavut'],['ON','Ontario'],['PE','Prince Edward Island'],['QC','Quebec'],['SK','Saskatchewan'],['YT','Yukon'],
  ]),
};
const canadianRegionCodes=new Set(northAmericaRegions.CA.map(region=>region.code));

function ProfileSelectField({label,value,placeholder,icon,onPress,optional=false}:{label:string;value:string;placeholder:string;icon:keyof typeof Ionicons.glyphMap;onPress:()=>void;optional?:boolean}){
  return <View style={selectorStyles.selectField}><Text style={shared.label}>{label}{optional?' · optional':''}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value||placeholder}`} onPress={onPress} style={[selectorStyles.selectButton,!!value&&selectorStyles.selectButtonOn]}><MiniPremiumIcon name={icon} tone={value?'gold':'dark'} size={32} iconSize={15}/><Text numberOfLines={1} style={[selectorStyles.selectValue,!value&&selectorStyles.selectPlaceholder]}>{value||placeholder}</Text><MiniPremiumIcon name="chevron-down" tone="dark" size={25} iconSize={12}/></Pressable></View>
}

function ProfileOptionSheet({visible,title,subtitle,options,value,searchable=false,allowCustom=false,onClose,onSelect}:{visible:boolean;title:string;subtitle:string;options:string[];value:string;searchable?:boolean;allowCustom?:boolean;onClose:()=>void;onSelect:(value:string)=>void}){
  const [query,setQuery]=useState('');
  useEffect(()=>{if(visible)setQuery('')},[visible,title]);
  const normalized=query.trim().toLowerCase();
  const filtered=options.filter(option=>!normalized||option.toLowerCase().includes(normalized));
  const custom=query.trim();
  const showCustom=allowCustom&&custom.length>=2&&!options.some(option=>option.toLowerCase()===custom.toLowerCase());
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={[chatStyles.sheet,selectorStyles.optionSheet]}><SheetHeader title={title} subtitle={subtitle} onClose={onClose}/>{searchable&&<View style={selectorStyles.sheetSearch}><Ionicons name="search" size={18} color={colors.muted}/><TextInput autoFocus={Platform.OS==='web'} value={query} onChangeText={setQuery} placeholder={`Search ${title.toLowerCase()}`} placeholderTextColor="#746A73" style={selectorStyles.sheetSearchInput}/>{!!query&&<Pressable accessibilityLabel="Clear search" onPress={()=>setQuery('')}><Ionicons name="close-circle" size={20} color={colors.muted}/></Pressable>}</View>}<ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={selectorStyles.optionList}>{showCustom&&<Pressable accessibilityRole="button" onPress={()=>onSelect(custom)} style={selectorStyles.customOption}><MiniPremiumIcon name="add" tone="gold" size={29} iconSize={14}/><View style={{flex:1}}><Text style={selectorStyles.optionTitle}>Use “{custom}”</Text><Text style={selectorStyles.optionBody}>Add this to your profile</Text></View></Pressable>}{filtered.map(option=>{const selected=option===value;return <Pressable accessibilityRole="button" accessibilityState={{selected}} key={option} onPress={()=>onSelect(option)} style={[selectorStyles.optionRow,selected&&selectorStyles.optionRowOn]}><Text style={[selectorStyles.optionTitle,selected&&{color:'#F5DFA9'}]}>{option}</Text>{selected?<MiniPremiumIcon name="checkmark" tone="gold" size={26} iconSize={12}/>:<Ionicons name="chevron-forward" size={16} color="#786A74"/>}</Pressable>})}{!filtered.length&&!showCustom&&<View style={selectorStyles.emptyState}><MiniPremiumIcon name="search" tone="dark" size={38} iconSize={18}/><Text style={styles.cardTitle}>No exact match</Text><Text style={styles.helper}>Try a shorter search.</Text></View>}</ScrollView></SafeAreaView></Modal>
}

function CityPickerSheet({visible,value,onClose,onSelect}:{visible:boolean;value:string;onClose:()=>void;onSelect:(value:string)=>void}){
  const [country,setCountry]=useState<'US'|'CA'>('US');
  const [regionCode,setRegionCode]=useState('');
  const [regionQuery,setRegionQuery]=useState('');
  const [cityQuery,setCityQuery]=useState('');
  const [cities,setCities]=useState<CityOption[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    if(!visible)return;
    const currentCode=value.split(',').at(-1)?.trim().toUpperCase()??'';
    const nextCountry=canadianRegionCodes.has(currentCode)?'CA':'US';
    setCountry(nextCountry);
    setRegionCode(northAmericaRegions[nextCountry].some(region=>region.code===currentCode)?currentCode:'');
    setRegionQuery('');
    setCityQuery(value.includes(',')?value.slice(0,value.lastIndexOf(',')).trim():'');
    setCities([]);
    setError('');
  },[visible,value]);
  useEffect(()=>{
    if(!visible||!regionCode)return;
    let cancelled=false;
    setLoading(true);
    setError('');
    getCitiesOfState(country,regionCode).then(items=>{
      if(cancelled)return;
      setCities(items.map(item=>({id:item.id,name:item.name})).sort((a,b)=>a.name.localeCompare(b.name)));
      setLoading(false);
    }).catch(()=>{
      if(cancelled)return;
      const fallback=profileCities.filter(item=>item.endsWith(`, ${regionCode}`)).map((item,index)=>({id:`fallback-${index}`,name:item.slice(0,item.lastIndexOf(','))}));
      setCities(fallback);
      setError('Live city list could not load. You can still type and use your city below.');
      setLoading(false);
    });
    return()=>{cancelled=true};
  },[visible,country,regionCode]);
  const regions=northAmericaRegions[country].filter(region=>!regionQuery.trim()||`${region.name} ${region.code}`.toLowerCase().includes(regionQuery.trim().toLowerCase()));
  const normalizedCity=cityQuery.trim().toLowerCase();
  const filteredCities=cities.filter(city=>!normalizedCity||city.name.toLowerCase().includes(normalizedCity)).slice(0,60);
  const selectedRegion=northAmericaRegions[country].find(region=>region.code===regionCode);
  const customCity=cityQuery.trim();
  const canUseCustom=customCity.length>=2&&!cities.some(city=>city.name.toLowerCase()===customCity.toLowerCase());
  const changeCountry=(next:'US'|'CA')=>{setCountry(next);setRegionCode('');setRegionQuery('');setCityQuery('');setCities([]);setError('')};
  const selectCity=(name:string)=>{onSelect(`${name}, ${regionCode}`);onClose()};
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={[chatStyles.sheet,selectorStyles.citySheet]}><SheetHeader title="Choose your city" subtitle="USA and Canada city search" onClose={onClose}/><View style={selectorStyles.countrySegment}>{(['US','CA'] as const).map(code=><Pressable accessibilityRole="button" accessibilityState={{selected:country===code}} key={code} onPress={()=>changeCountry(code)} style={[selectorStyles.countryOption,country===code&&selectorStyles.countryOptionOn]}><Text style={[selectorStyles.countryText,country===code&&selectorStyles.countryTextOn]}>{code==='US'?'United States':'Canada'}</Text></Pressable>)}</View>{!regionCode?<><Text style={selectorStyles.sheetLabel}>{country==='US'?'STATE OR TERRITORY':'PROVINCE OR TERRITORY'}</Text><View style={selectorStyles.sheetSearch}><Ionicons name="search" size={18} color={colors.muted}/><TextInput autoFocus={Platform.OS==='web'} value={regionQuery} onChangeText={setRegionQuery} placeholder={country==='US'?'Search state':'Search province'} placeholderTextColor="#746A73" style={selectorStyles.sheetSearchInput}/></View><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={selectorStyles.optionList}>{regions.map(region=><Pressable accessibilityRole="button" key={region.code} onPress={()=>{setRegionCode(region.code);setCityQuery('')}} style={selectorStyles.optionRow}><View style={{flex:1}}><Text style={selectorStyles.optionTitle}>{region.name}</Text><Text style={selectorStyles.optionBody}>{region.code}</Text></View><Ionicons name="chevron-forward" size={16} color="#786A74"/></Pressable>)}</ScrollView></>:<><View style={selectorStyles.regionBar}><View style={{flex:1}}><Text style={selectorStyles.sheetLabel}>SEARCHING IN</Text><Text style={selectorStyles.regionName}>{selectedRegion?.name}, {country==='US'?'USA':'Canada'}</Text></View><Pressable accessibilityRole="button" onPress={()=>{setRegionCode('');setRegionQuery('');setCityQuery('')}} style={selectorStyles.changeRegion}><Text style={selectorStyles.changeRegionText}>Change</Text></Pressable></View><View style={selectorStyles.sheetSearch}><Ionicons name="search" size={18} color={colors.muted}/><TextInput autoFocus={Platform.OS==='web'} value={cityQuery} onChangeText={setCityQuery} placeholder="Start typing your city" placeholderTextColor="#746A73" style={selectorStyles.sheetSearchInput}/>{!!cityQuery&&<Pressable accessibilityLabel="Clear city search" onPress={()=>setCityQuery('')}><Ionicons name="close-circle" size={20} color={colors.muted}/></Pressable>}</View>{loading?<View style={selectorStyles.emptyState}><MiniPremiumIcon name="hourglass-outline" tone="gold" size={38} iconSize={18}/><Text style={styles.cardTitle}>Loading cities…</Text></View>:<ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={selectorStyles.optionList}>{!!error&&<View style={selectorStyles.dataNotice}><Ionicons name="cloud-offline-outline" size={17} color={colors.gold}/><Text style={selectorStyles.dataNoticeText}>{error}</Text></View>}{canUseCustom&&<Pressable accessibilityRole="button" onPress={()=>selectCity(customCity)} style={selectorStyles.customOption}><MiniPremiumIcon name="location" tone="gold" size={29} iconSize={14}/><View style={{flex:1}}><Text style={selectorStyles.optionTitle}>Use “{customCity}, {regionCode}”</Text><Text style={selectorStyles.optionBody}>Choose this city</Text></View></Pressable>}{filteredCities.map(city=><Pressable accessibilityRole="button" key={`${city.id}-${city.name}`} onPress={()=>selectCity(city.name)} style={selectorStyles.optionRow}><Text style={selectorStyles.optionTitle}>{city.name}</Text><Ionicons name="chevron-forward" size={16} color="#786A74"/></Pressable>)}{!cityQuery&&<View style={selectorStyles.emptyState}><MiniPremiumIcon name="location-outline" tone="dark" size={38} iconSize={18}/><Text style={styles.cardTitle}>Type your city</Text><Text style={styles.helper}>Every city in {selectedRegion?.name} is searchable.</Text></View>}</ScrollView>}</>}</SafeAreaView></Modal>
}

function ProfileSetup({
  profile,
  onProfileChange,
  photos,
  onPhotosChange,
  voiceUri,
  onVoiceChange,
  onNext,
}:{
  profile:ProfileDraft;
  onProfileChange:(profile:ProfileDraft)=>void;
  photos:string[];
  onPhotosChange:(photos:string[])=>void;
  voiceUri:string;
  onVoiceChange:(uri:string)=>void;
  onNext:()=>void;
}) {
  const {width}=useWindowDimensions();
  const [mediaError,setMediaError]=useState('');
  const [photoPickerIndex,setPhotoPickerIndex]=useState<number|null>(null);
  const [profilePicker,setProfilePicker]=useState<ProfilePickerKind|null>(null);
  const [cityPickerVisible,setCityPickerVisible]=useState(false);
  const compactPhotos=width<520;
  const photoPrompts=[
    {title:'A clear hello',body:'Face the camera'},
    {title:'Your full look',body:'Show your style'},
    {title:'Your world',body:'A moment you love'},
  ];
  const updateProfile=<Key extends keyof ProfileDraft>(key:Key,value:ProfileDraft[Key])=>onProfileChange({...profile,[key]:value});
  const ageEligible=isEligibleMemberAge(profile.age);
  const profileReady=photos.length>=3&&profile.firstName.trim().length>=2&&!!profile.gender&&ageEligible&&!!profile.height&&!!profile.city&&profile.profession.trim().length>=2;
  const continueLabel=photos.length<3?'Add 3 photos to keep going':!profile.firstName.trim()?'Add your name to keep going':!profile.gender?'Choose how you identify':!ageEligible?'Choose an age from 18–50':!profile.height?'Choose your height':!profile.city?'Choose your city':!profile.profession.trim()?'Choose what you do':'Looks good, keep going';
  const pickerOptions=profilePicker==='age'?profileAgeOptions:profilePicker==='height'?profileHeightOptions:profilePicker==='profession'?profileProfessionOptions:profileCommunityOptions;
  const pickerValue=profilePicker==='age'?profile.age:profilePicker==='height'?profile.height:profilePicker==='profession'?profile.profession:profile.community;
  const pickerTitle=profilePicker==='age'?'Choose your age':profilePicker==='height'?'Choose your height':profilePicker==='profession'?'What do you do?':'Culture / community';
  const pickerSubtitle=profilePicker==='age'?'DestinyOne is for adults ages 18–50.':profilePicker==='height'?'Pick the closest height.':profilePicker==='profession'?'Search or add the answer that fits you.':'Choose one or add your own.';
  const selectPickerValue=(value:string)=>{
    if(profilePicker==='age')updateProfile('age',value);
    if(profilePicker==='height')updateProfile('height',value);
    if(profilePicker==='profession')updateProfile('profession',value);
    if(profilePicker==='community')updateProfile('community',value);
    setProfilePicker(null);
  };
  const pickPhoto=async(index:number)=>{
    setMediaError('');
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){setMediaError('Photo library permission is needed to add profile photos.');return}
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[4,5],quality:.85});
    if(!result.canceled&&result.assets[0]){const next=[...photos];next[index]=result.assets[0].uri;onPhotosChange(next.filter(Boolean))}
  };
  const takePhoto=async(index:number)=>{
    setMediaError('');
    const permission=await ImagePicker.requestCameraPermissionsAsync();
    if(!permission.granted){setMediaError('Camera permission is needed to take a profile photo.');return}
    const result=await ImagePicker.launchCameraAsync({mediaTypes:['images'],allowsEditing:true,aspect:[4,5],quality:.85});
    if(!result.canceled&&result.assets[0]){const next=[...photos];next[index]=result.assets[0].uri;onPhotosChange(next.filter(Boolean))}
  };
  const choosePhoto=(index:number)=>{
    setPhotoPickerIndex(index);
  };
  const removePhoto=(index:number)=>onPhotosChange(photos.filter((_,photoIndex)=>photoIndex!==index));
  return <FormPage step={3} scroll>
    <SectionTitle eyebrow="MAKE A FIRST IMPRESSION" title="Make them want to know more." body="Three good photos. A few real details. Zero résumé energy."/>
    <View style={profileSetupStyles.photoSection}>
      <View style={profileSetupStyles.photoHeader}><View style={{flex:1}}><Text style={shared.label}>Start with 3 photos that feel like you</Text><Text style={styles.helper}>Portrait photos are cropped to 4:5. Tap any photo to replace it.</Text></View><View style={profileSetupStyles.photoCount}><Text style={profileSetupStyles.photoCountText}>{photos.length}/3</Text></View></View>
      <View style={styles.photoRow}>{[0,1,2].map(index=><Pressable accessibilityRole="button" accessibilityLabel={photos[index]?`Replace photo ${index+1}`:`Add photo ${index+1}`} onPress={()=>choosePhoto(index)} key={index} style={[styles.addPhoto,!compactPhotos&&profileSetupStyles.photoDesktop]}>{photos[index]?<><Image source={{uri:photos[index]}} resizeMode="cover" style={styles.fill}/><LinearGradient pointerEvents="none" colors={['transparent','rgba(11,2,8,.84)']} style={profileSetupStyles.photoOverlay}><Text style={profileSetupStyles.photoChange}>Tap to replace</Text></LinearGradient><Pressable accessibilityLabel={`Remove photo ${index+1}`} onPress={event=>{event.stopPropagation();removePhoto(index)}} style={profileSetupStyles.photoRemove}><Ionicons name="close" size={15} color={colors.ivory}/></Pressable></>:<View style={profileSetupStyles.photoEmpty}><MiniPremiumIcon name="add" tone="plum" size={34} iconSize={17}/><Text style={profileSetupStyles.photoPrompt}>{photoPrompts[index]!.title}</Text><Text style={profileSetupStyles.photoHint}>{photoPrompts[index]!.body}</Text></View>}<View pointerEvents="none" style={styles.photoNum}><Text style={styles.photoNumText}>{index+1}</Text></View></Pressable>)}</View>
      {!!mediaError&&<Text style={styles.formError}>{mediaError}</Text>}
    </View>
    <View style={{gap:16}}>
      <Field label="First name" placeholder="Your first name" value={profile.firstName} onChangeText={(text:string)=>updateProfile('firstName',text)}/>
      <View style={{gap:8}}><Text style={shared.label}>I identify as</Text><View style={aiStyles.filterWrap}>{([
        ['woman','Woman'],['man','Man'],['nonbinary','Non-binary'],
      ] as const).map(([value,label])=><FilterChip key={value} label={label} active={profile.gender===value} onPress={()=>updateProfile('gender',value)}/>)}</View></View>
      <View style={[styles.twoCol,{width:'100%',minWidth:0}]}><View style={{flex:1,minWidth:0}}><ProfileSelectField label="Age" value={profile.age} placeholder="Choose" icon="calendar-outline" onPress={()=>setProfilePicker('age')}/></View><View style={{flex:1,minWidth:0}}><ProfileSelectField label="Height" value={profile.height} placeholder="Choose" icon="resize-outline" onPress={()=>setProfilePicker('height')}/></View></View>
      <ProfileSelectField label="City" value={profile.city} placeholder="Search USA or Canada city" icon="location-outline" onPress={()=>setCityPickerVisible(true)}/>
      <ProfileSelectField label="What do you do?" value={profile.profession} placeholder="Choose your profession" icon="briefcase-outline" onPress={()=>setProfilePicker('profession')}/>
      <View style={{gap:8}}>
        <Text style={shared.label}>Faith · optional</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
          {religions.map(option=><Pressable key={option} onPress={()=>updateProfile('religion',profile.religion===option?'':option)} style={[selectorStyles.religionChip,profile.religion===option&&selectorStyles.religionChipOn]}><Text style={[selectorStyles.religionText,profile.religion===option&&{color:colors.ivory}]}>{option}</Text>{profile.religion===option&&<MiniPremiumIcon name="checkmark" tone="gold" size={22} iconSize={10}/>}</Pressable>)}
        </ScrollView>
      </View>
      <ProfileSelectField label="Culture / community" value={profile.community} placeholder="Choose or add your culture" icon="people-outline" optional onPress={()=>setProfilePicker('community')}/>
    </View>
    <VoiceIntroRecorder uri={voiceUri} onChange={onVoiceChange}/>
    <Button label={continueLabel} disabled={!profileReady} onPress={onNext}/>
    <PhotoPickerSheet visible={photoPickerIndex!==null} slot={photoPickerIndex===null?0:photoPickerIndex+1} onClose={()=>setPhotoPickerIndex(null)} onCamera={()=>{const index=photoPickerIndex;if(index===null)return;setPhotoPickerIndex(null);void takePhoto(index)}} onGallery={()=>{const index=photoPickerIndex;if(index===null)return;setPhotoPickerIndex(null);void pickPhoto(index)}}/>
    <ProfileOptionSheet visible={profilePicker!==null} title={pickerTitle} subtitle={pickerSubtitle} options={pickerOptions} value={pickerValue} searchable={profilePicker==='profession'||profilePicker==='community'} allowCustom={profilePicker==='profession'||profilePicker==='community'} onClose={()=>setProfilePicker(null)} onSelect={selectPickerValue}/>
    <CityPickerSheet visible={cityPickerVisible} value={profile.city} onClose={()=>setCityPickerVisible(false)} onSelect={value=>updateProfile('city',value)}/>
  </FormPage>
}

function PhotoPickerSheet({visible,slot,onClose,onCamera,onGallery}:{visible:boolean;slot:number;onClose:()=>void;onCamera:()=>void;onGallery:()=>void}){
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={chatStyles.sheet}><SheetHeader title={`Add photo ${slot}`} subtitle="Choose a clear, recent favorite." onClose={onClose}/><View style={mediaStyles.photoChoiceHero}><PremiumIcon name="images" tone="gold" size={54} iconSize={25}/><View style={{flex:1}}><Text style={styles.cardTitle}>Let them see the real you.</Text><Text style={styles.helper}>Bright, recent, and easy to recognize.</Text></View></View><View style={mediaStyles.photoChoiceGrid}><Pressable onPress={onCamera} style={mediaStyles.photoChoice}><PremiumIcon name="camera" tone="ruby" size={50} iconSize={23}/><Text style={mediaStyles.photoChoiceTitle}>Camera</Text><Text style={mediaStyles.photoChoiceBody}>Take a new photo</Text></Pressable><Pressable onPress={onGallery} style={mediaStyles.photoChoice}><PremiumIcon name="image" tone="plum" size={50} iconSize={23}/><Text style={mediaStyles.photoChoiceTitle}>Gallery</Text><Text style={mediaStyles.photoChoiceBody}>Choose a favorite</Text></Pressable></View><Text style={styles.legal}>Your photos stay private until you finish your profile.</Text></SafeAreaView></Modal>
}

function VoiceIntroRecorder({uri,onChange}:{uri:string;onChange:(uri:string)=>void}) {
  const [error,setError]=useState('');
  const recorder=useAudioRecorder(RecordingPresets.HIGH_QUALITY,(status)=>{
    if(status.hasError)setError(status.error??'Recording failed. Please try again.');
    if(status.isFinished&&status.url)onChange(status.url);
  });
  const recorderState=useAudioRecorderState(recorder,200);
  const player=useAudioPlayer(uri||null);
  const playerStatus=useAudioPlayerStatus(player);
  const start=async()=>{
    setError('');
    const permission=await requestRecordingPermissionsAsync();
    if(!permission.granted){setError('Microphone permission is needed to record your introduction.');return}
    await setAudioModeAsync({allowsRecording:true,playsInSilentMode:true});
    await recorder.prepareToRecordAsync();
    recorder.record({forDuration:30});
  };
  const stop=async()=>{await recorder.stop();await setAudioModeAsync({allowsRecording:false});if(recorder.uri)onChange(recorder.uri)};
  const duration=Math.max(0,Math.round(recorderState.durationMillis/1000));
  return <View style={mediaStyles.voiceRecorder}>
    <View style={shared.row}><PremiumIcon name={recorderState.isRecording?'mic':'volume-medium'} tone="ruby" size={43} iconSize={20}/><View style={{flex:1}}><Text style={styles.cardTitle}>Let them hear your vibe</Text><Text style={styles.helper}>{recorderState.isRecording?`Recording · 0:${String(duration).padStart(2,'0')} / 0:30`:uri?'Your hello is ready to play':'A 30-second hello beats another bio.'}</Text></View></View>
    {uri&&!recorderState.isRecording&&<View style={mediaStyles.voiceActions}><Pressable onPress={()=>playerStatus.playing?player.pause():player.play()} style={mediaStyles.mediaAction}><MiniPremiumIcon name={playerStatus.playing?'pause':'play'} tone="plum" size={30} iconSize={14}/><Text style={mediaStyles.mediaActionText}>{playerStatus.playing?'Pause':'Preview'}</Text></Pressable><Pressable onPress={()=>onChange('')} style={mediaStyles.deleteAction}><MiniPremiumIcon name="trash-outline" tone="ruby" size={34} iconSize={16}/></Pressable></View>}
    {!uri&&<Button variant="secondary" label={recorderState.isRecording?'Stop & save':'Record voice intro'} icon={recorderState.isRecording?'stop':'mic'} onPress={recorderState.isRecording?stop:start}/>} 
    {!!error&&<Text style={styles.formError}>{error}</Text>}
  </View>
}

const vibeIcons: Array<keyof typeof Ionicons.glyphMap> = ['people','rocket','airplane','barbell','sparkles','restaurant','briefcase','leaf','heart-circle','color-palette','home','flower','paw','book','musical-notes','globe'];
const vibeDescriptions=['Roots matter','Big goals','Always exploring','Move & grow','Inner calm','New table? Yes.','Build mode','Low-key joy','Talk it through','Make something','Cozy future','Tradition + now','Animal person','One more chapter','Live & loud','Show up for people'];
function Vibes({value,onChange,onNext}:{value:string[];onChange:(x:string[])=>void;onNext:()=>void}) {
  const toggle=(v:string)=>onChange(value.includes(v)?value.filter(x=>x!==v):value.length<5?[...value,v]:value);
  return <FormPage step={4} scroll>
    <View style={vibeStyles.hero}>
      <Text style={styles.kicker}>{value.length} OF 5 LOCKED IN</Text>
      <Text style={[shared.h1,{textAlign:'center'}]}>What’s your real-life vibe?</Text>
      <Text style={[shared.body,{textAlign:'center'}]}>Pick the five that feel most like you. The mix is what makes it interesting.</Text>
      <View style={vibeStyles.progressDots}>{[0,1,2,3,4].map(index=><View key={index} style={[vibeStyles.progressDot,index<value.length&&vibeStyles.progressDotOn]}/>)}</View>
    </View>
    <View style={styles.vibeGrid}>{vibes.map((v,i)=><Pressable onPress={()=>toggle(v)} key={v} style={[styles.vibeCard,vibeStyles.card,value.includes(v)&&styles.vibeSelected]}>
      <PremiumIcon name={vibeIcons[i]??'heart'} tone={value.includes(v)?'gold':'plum'} size={40} iconSize={18}/>
      <View style={vibeStyles.copy}><Text numberOfLines={2} style={[styles.vibeText,value.includes(v)&&{color:colors.ivory}]}>{v}</Text><Text numberOfLines={1} style={[vibeStyles.description,value.includes(v)&&vibeStyles.descriptionOn]}>{value.includes(v)?'Locked in':vibeDescriptions[i]}</Text></View>
      {value.includes(v)&&<View style={vibeStyles.vibeCheck}><MiniPremiumIcon name="checkmark" tone="gold" size={25} iconSize={12}/></View>}
    </Pressable>)}</View>
    <View style={vibeStyles.tipCard}><MiniPremiumIcon name="sparkles" tone="gold" size={34} iconSize={16}/><Text style={[styles.helper,{flex:1}]}>Pick your normal-Tuesday self. That’s usually where the best chemistry starts.</Text></View>
    <Button label={value.length===5?'Lock in my five':'Choose 5 to continue'} disabled={value.length!==5} onPress={onNext}/>
  </FormPage>
}

function Intent({value,onChange,onNext}:{value:string;onChange:(x:string)=>void;onNext:()=>void}) {
  const options=[
    {value:'Long-term Relationship',title:'Long-term relationship',description:'Something steady, exclusive and built to last.',icon:'heart-outline' as const},
    {value:'Marriage',title:'Marriage',description:'I’m ready to meet my life partner.',icon:'diamond-outline' as const},
    {value:'Long-term, leading to Marriage',title:'Long-term, leading to marriage',description:'Let it grow naturally, with marriage in view.',icon:'infinite-outline' as const},
  ];
  return <FormPage step={5}>
    <SectionTitle eyebrow="NO MIXED SIGNALS" title="What are you here for?" body="Say it clearly. We’ll show you people looking for the same kind of future."/>
    <View style={styles.seriousPromise}><MiniPremiumIcon name="shield-checkmark" tone="rose" size={38} iconSize={18}/><Text style={styles.seriousPromiseText}>DestinyOne is for commitment, not casual dating.</Text></View>
    <View style={{gap:12}}>{options.map(({value:optionValue,title,description,icon})=><Pressable key={optionValue} onPress={()=>onChange(optionValue)} style={[styles.intent,value===optionValue&&styles.intentSelected]}><PremiumIcon name={icon} tone={value===optionValue?'gold':'plum'} size={44} iconSize={20}/><View style={{flex:1}}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.helper}>{description}</Text></View><View style={[styles.radio,value===optionValue&&styles.radioOn]}>{value===optionValue&&<View style={styles.radioDot}/>}</View></Pressable>)}</View>
    <View style={shared.spacer}/><Button label="Next" icon="arrow-forward" onPress={onNext}/>
  </FormPage>
}

const alignmentQuestions=[
  {key:'timeline',eyebrow:'MARRIAGE PACE',title:'What pace feels right for marriage?',options:['Within 1–2 years','Within 2–3 years','When the relationship feels ready']},
  {key:'children',eyebrow:'FAMILY PLANS',title:'Do you see children in your future?',options:['Definitely want children','Open to children','Do not want children']},
  {key:'family',eyebrow:'FAMILY & US',title:'How close should family be to your relationship?',options:['Family is deeply involved','Close, with healthy boundaries','Mostly independent as a couple']},
  {key:'relocation',eyebrow:'WHERE LIFE GOES',title:'Could love take you to a new city?',options:['Yes, I’m open','Depends on career and family','I prefer to stay in my city']},
];

function Alignment({value,onChange,onNext}:{value:Record<string,string>;onChange:(x:Record<string,string>)=>void;onNext:()=>void}) {
  const [question,setQuestion]=useState(0);
  const current=alignmentQuestions[question]!;
  const selected=value[current.key];
  const choose=(option:string)=>onChange({...value,[current.key]:option});
  const advance=()=>question<alignmentQuestions.length-1?setQuestion(question+1):onNext();
  return <FormPage step={6}>
    <View style={alignmentStyles.hero}><PremiumIcon name={(question===0?'diamond':question===1?'happy':question===2?'people':'home') as keyof typeof Ionicons.glyphMap} tone="ruby" size={52} iconSize={24}/><Text style={styles.kicker}>{current.eyebrow}</Text><Text style={[shared.h1,{textAlign:'center'}]}>{current.title}</Text><Text style={[shared.body,{textAlign:'center'}]}>No perfect answer. Just what feels true for you.</Text></View>
    <View style={styles.alignmentProgress}><Text style={styles.helper}>{question+1} of {alignmentQuestions.length}</Text><View style={styles.alignmentTrack}><View style={[styles.alignmentFill,{width:`${((question+1)/alignmentQuestions.length)*100}%`}]} /></View></View>
    <View style={{gap:10}}>{current.options.map((option,index)=><Pressable key={option} onPress={()=>choose(option)} style={[styles.answer,alignmentStyles.answerCard,selected===option&&styles.intentSelected]}><MiniPremiumIcon name={(index===0?'heart':index===1?'leaf':'sparkles') as keyof typeof Ionicons.glyphMap} tone={selected===option?'gold':'rose'} size={36} iconSize={17}/><Text style={[styles.answerText,{flex:1}]}>{option}</Text><MiniPremiumIcon name={selected===option?'checkmark-circle':'ellipse-outline'} tone={selected===option?'gold':'dark'} size={30} iconSize={14}/></Pressable>)}</View>
    <Text style={[styles.helper,{textAlign:'center'}]}>Private by default. Change anytime.</Text>
    <View style={shared.spacer}/>
    <Button disabled={!selected} label={question===alignmentQuestions.length-1?'See my introductions':'Next'} onPress={advance}/>
  </FormPage>
}

function HomeClean({items,matchLoadState,matchingPoolStatus,onRetryMatches,preferences,alignment,signals,dismissedCount,profileGrowth,crossedPaths,openDetail,onInterested,onSkip,onRose,navigate}:{items:Match[];matchLoadState:MemberMatchLoadState;matchingPoolStatus:MatchingPoolStatus|null;onRetryMatches:()=>void;preferences:{intent:string;vibes:string[];filters:MatchFilters};alignment:Record<string,string>;signals:DiscoverySignal[];dismissedCount:number;profileGrowth:ProfileGrowthInput;roseAvailability:RoseAvailability;crossedPaths:boolean;openDetail:(m:Match)=>void;onInterested:(m:Match)=>void;onSkip:(m:Match)=>void;onRose:(m:Match)=>void;navigate:(s:Screen)=>void}){
  const {width}=useWindowDimensions();
  const useMatchGrid=width>=900;
  const compactHome=width<430;
  const {featured,remaining:rest,heldForFutureDays}=buildDailyIntroductionDeck(items);
  const growth=buildHomeGrowthLoop({visibleMatches:items,preferences,signals,dismissedCount,profile:profileGrowth});
  const retention=growth.retention;
  const primaryNudge=growth.nudges[0];
  const openNudge=(nudge:GrowthNudge)=>{
    if(nudge.actionScreen==='detail'&&featured){openDetail(featured);return}
    navigate(nudge.actionScreen);
  };
  const passportInput={intent:preferences.intent,alignment};
  const poolNeedsVerification=matchingPoolStatus?.status==='verification_required';
  const poolNeedsPreferences=matchingPoolStatus?.status==='preferences_incomplete';
  const poolMessage=matchingPoolStatus?.suggestions[0]??'No verified profiles meet your preferences right now. We will refresh your introductions as the community grows.';
  return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}><SafeAreaView style={[shared.safe,{maxWidth:920,paddingHorizontal:0}]}> 
    <View style={homeCleanStyles.header}>
      <View style={{flex:1}}>
        <Text style={homeCleanStyles.brandLine}>DESTINY<Text style={homeCleanStyles.brandOne}>ONE</Text></Text>
        <Text numberOfLines={1} style={[shared.h2,compactHome&&homeCleanStyles.headingCompact]}>Today's introductions</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Match filters" onPress={()=>navigate('discovery')} style={homeCleanStyles.headerButton}><PremiumIcon name="options-outline" tone="dark" size={36} iconSize={17}/></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={()=>navigate('profile')} style={homeCleanStyles.headerButton}><PremiumIcon name="person-outline" tone="ruby" size={36} iconSize={17}/></Pressable>
    </View>

    <ScrollView contentContainerStyle={homeCleanStyles.content} showsVerticalScrollIndicator={false}>
      <View style={homeCleanStyles.hero}>
        <LinearGradient colors={['rgba(255,36,72,.15)','rgba(255,255,255,.025)']} style={StyleSheet.absoluteFill}/>
        <View style={homeCleanStyles.dailyCount}>
          <Text style={homeCleanStyles.statNumber}>{retention.dailyMatches}</Text>
          <Text style={homeCleanStyles.statLabel}>curated today</Text>
        </View>
        <View style={homeCleanStyles.heroCopy}>
          <Text style={homeCleanStyles.heroTitle}>Chosen around your future.</Text>
          <Text style={homeCleanStyles.heroBody}>Five thoughtful introductions. Clear intent before chemistry, with room for a real conversation.</Text>
        </View>
      </View>

      <IntentPassportCard input={passportInput} compact onEdit={()=>navigate('alignment')}/>

      {crossedPaths&&<Pressable onPress={()=>navigate('discovery')} style={homeCleanStyles.crossedMini}>
        <MiniPremiumIcon name="location" tone="gold" size={32} iconSize={15}/>
        <Text style={homeCleanStyles.crossedText}>Crossed paths is on — nearby profiles are included privately.</Text>
        <MiniPremiumIcon name="chevron-forward" tone="dark" size={28} iconSize={13}/>
      </Pressable>}

      {featured&&<View style={homeCleanStyles.featuredWrap}>
        <View style={homeCleanStyles.sectionRow}><Text style={styles.sectionLabel}>YOUR TOP MATCH</Text><Text style={homeCleanStyles.sectionHint}>Tap to see the full story</Text></View>
        <MatchCard match={featured} reasons={featured.reasons??matchReasons(featured,preferences)} onPress={()=>openDetail(featured)} onInterested={()=>onInterested(featured)} onSkip={()=>onSkip(featured)} onRose={()=>onRose(featured)}/>
      </View>}

      {primaryNudge&&<Pressable onPress={()=>openNudge(primaryNudge)} style={homeCleanStyles.nudgeRow}>
        <MiniPremiumIcon name={primaryNudge.icon as keyof typeof Ionicons.glyphMap} tone="gold" size={34} iconSize={16}/>
        <View style={{flex:1}}><Text style={homeCleanStyles.nudgeTitle}>{primaryNudge.title}</Text><Text numberOfLines={1} style={homeCleanStyles.nudgeBody}>{primaryNudge.body}</Text></View>
        <Text style={homeCleanStyles.nudgeAction}>{primaryNudge.actionLabel}</Text>
      </Pressable>}

      {rest.length>0&&<View style={homeCleanStyles.sectionRow}><Text style={styles.sectionLabel}>TODAY'S OTHER INTRODUCTIONS</Text><Text style={homeCleanStyles.sectionHint}>{rest.length} remaining</Text></View>}
      <View style={useMatchGrid&&homeCleanStyles.matchGrid}>{rest.map(match=><View key={match.id} style={useMatchGrid&&homeCleanStyles.matchGridItem}><MatchCard compact={useMatchGrid} match={match} reasons={match.reasons??matchReasons(match,preferences)} onPress={()=>openDetail(match)} onInterested={()=>onInterested(match)} onSkip={()=>onSkip(match)} onRose={()=>onRose(match)}/></View>)}</View>
      {heldForFutureDays>0&&<View style={homeCleanStyles.futureDeckNote}><MiniPremiumIcon name="time-outline" tone="gold" size={30} iconSize={14}/><View style={{flex:1}}><Text style={homeCleanStyles.futureDeckTitle}>A considered pace</Text><Text style={homeCleanStyles.futureDeckBody}>More compatible members are held for future daily introductions, so each profile gets real attention.</Text></View></View>}

      {!items.length&&<View style={[shared.card,homeCleanStyles.emptyCard]}>
        <PremiumIcon name={matchLoadState==='error'?'cloud-offline-outline':matchLoadState==='loading'?'hourglass-outline':'heart-outline'} tone={matchLoadState==='error'?'ruby':'plum'} size={58} iconSize={27}/>
        <Text style={styles.cardTitle}>{matchLoadState==='error'?'Could not load your matches':matchLoadState==='loading'?'Curating your matches…':matchLoadState==='preview'?'No profiles match these filters':'Your next introduction is being curated'}</Text>
        <Text style={[styles.helper,{textAlign:'center'}]}>{matchLoadState==='error'?'We will never replace unavailable member data with demo profiles. Check your connection and try again.':matchLoadState==='loading'?'Verified profiles are loading securely.':matchLoadState==='preview'?'Try widening age, city, vibe or family filters.':poolMessage}</Text>
        {matchLoadState==='error'?<Button label="Try again" icon="refresh" onPress={onRetryMatches}/>:matchLoadState==='preview'?<Button label="Adjust filters" onPress={()=>navigate('discovery')}/>:poolNeedsVerification?<Button label="Complete verification" icon="shield-checkmark-outline" onPress={()=>navigate('verifyHub')}/>:poolNeedsPreferences?<Button label="Complete preferences" icon="options-outline" onPress={()=>navigate('discovery')}/>:matchLoadState==='ready'?<Button label="Review preferences" icon="options-outline" onPress={()=>navigate('discovery')}/>:null}
      </View>}
    </ScrollView>
    <BottomNav active="home" navigate={navigate}/>
  </SafeAreaView></LinearGradient>
}

function CoupleHome({state,hub,memberName,city,messages,onShare,onManage,onOpenTool,navigate}:{state:CoupleModeState;hub:CoupleConnectionHub;memberName:string;city:string;messages:ChatMessage[];onShare:()=>void;onManage:()=>void;onOpenTool:(tool:Exclude<CoupleLaunchTool,null>)=>void;navigate:(screen:Screen)=>void}){
  const {width}=useWindowDimensions();
  const wide=width>=720;
  const partnerName=state.connection.partner?.displayName||'Your partner';
  const connected=state.connection.status==='active';
  const incomingCount=hub.incomingRequests.length;
  const outgoingPartner=hub.outgoingRequests[0]?.member.displayName;
  const latestDate=[...messages].reverse().find(message=>message.type==='date'&&message.date)?.date;
  const actions=[
    {id:'dates',title:'Plan a date',body:'Places, restaurants, packages and events near you.',icon:'calendar' as const,tone:'gold' as const,onPress:()=>navigate('events'),locked:false},
    {id:'chat',title:'Private chat',body:'Messages, calls, photos, voice notes and live location.',icon:'chatbubble-ellipses' as const,tone:'ruby' as const,onPress:()=>navigate('chat'),locked:!connected},
    {id:'gift',title:'Send a gift',body:'Digital moments and real gift delivery with private address consent.',icon:'gift' as const,tone:'gold' as const,onPress:()=>onOpenTool('gift'),locked:!connected},
    {id:'games',title:'Play together',body:'Conversation games built for couples, not public scores.',icon:'game-controller' as const,tone:'plum' as const,onPress:()=>onOpenTool('games'),locked:!connected},
  ];
  return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}><SafeAreaView style={[shared.safe,{maxWidth:920,paddingHorizontal:0}]}> 
    <View style={coupleHomeStyles.header}><View style={{flex:1}}><Text style={coupleHomeStyles.brand}>DESTINY<Text style={{color:colors.gold}}>ONE</Text></Text><Text style={shared.h2}>Our space</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={()=>navigate('profile')}><PremiumIcon name="person-outline" tone="dark" size={40} iconSize={19}/></Pressable></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={coupleHomeStyles.content}>
      <LinearGradient colors={['rgba(153,10,38,.92)','rgba(74,4,20,.94)','rgba(42,24,7,.96)']} style={coupleHomeStyles.hero}>
        <View style={coupleHomeStyles.heroGlow}/><View style={coupleHomeStyles.avatarPair}><View style={coupleHomeStyles.initialAvatar}><Text style={coupleHomeStyles.initialText}>{(memberName||'Y')[0]?.toUpperCase()}</Text></View><View style={[coupleHomeStyles.initialAvatar,coupleHomeStyles.partnerAvatar]}><Text style={coupleHomeStyles.initialText}>{partnerName[0]?.toUpperCase()}</Text></View><View style={coupleHomeStyles.heartSeal}><Ionicons name="heart" size={18} color="#2A1005"/></View></View>
        <Text style={coupleHomeStyles.heroEyebrow}>{connected?'PRIVATE COUPLE SPACE':incomingCount?'REQUEST WAITING':outgoingPartner?'REQUEST SENT':'PARTNER CONNECTION NEEDED'}</Text><Text style={coupleHomeStyles.heroTitle}>{connected?`${memberName||'You'} & ${partnerName}`:incomingCount?'Someone wants to connect.':outgoingPartner?`Waiting for ${outgoingPartner}`:'Build this space together'}</Text><Text style={coupleHomeStyles.heroBody}>{connected?`Your chat, plans and shared moments stay together in one calm place${city?` around ${city}`:''}.`:incomingCount?'Review their minimal profile and accept only if you personally know them.':outgoingPartner?'They will see your request in their Couple Mode account. Shared tools unlock after acceptance.':'Search the exact verified phone number, send a request, and wait for your partner to accept.'}</Text>
        <View style={coupleHomeStyles.statusPill}><View style={[coupleHomeStyles.statusDot,connected&&coupleHomeStyles.statusDotOn]}/><Text style={coupleHomeStyles.statusText}>{connected?'Two-person space connected':incomingCount?`${incomingCount} request${incomingCount===1?'':'s'} waiting`:outgoingPartner?'Partner approval pending':'Not connected yet'}</Text></View>
      </LinearGradient>
      <View style={coupleHomeStyles.sectionHead}><Text style={styles.sectionLabel}>TOGETHER TOOLS</Text><Text style={coupleHomeStyles.sectionMeta}>Matching is off</Text></View>
      <View style={[coupleHomeStyles.actionGrid,wide&&coupleHomeStyles.actionGridWide]}>{actions.map(action=><Pressable accessibilityRole="button" accessibilityLabel={action.title} key={action.id} onPress={action.onPress} style={[coupleHomeStyles.action,wide&&coupleHomeStyles.actionWide]}><PremiumIcon name={action.icon} tone={action.tone} size={48} iconSize={22}/><View style={{flex:1}}><Text style={coupleHomeStyles.actionTitle}>{action.title}</Text><Text style={coupleHomeStyles.actionBody}>{action.body}</Text></View>{action.locked?<MiniPremiumIcon name="lock-closed" tone="dark" size={28} iconSize={13}/>:<Ionicons name="chevron-forward" size={17} color={colors.muted}/>}</Pressable>)}</View>
      {latestDate?<Pressable onPress={()=>navigate('chat')} style={coupleHomeStyles.nextPlan}><PremiumIcon name="calendar" tone="gold" size={46} iconSize={21}/><View style={{flex:1}}><Text style={styles.kicker}>NEXT SHARED PLAN</Text><Text style={coupleHomeStyles.planTitle}>{latestDate.venue}</Text><Text style={styles.helper}>{latestDate.time} · {latestDate.area}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.gold}/></Pressable>:<Pressable onPress={()=>navigate('events')} style={coupleHomeStyles.nextPlan}><PremiumIcon name="sparkles" tone="gold" size={46} iconSize={21}/><View style={{flex:1}}><Text style={styles.kicker}>MAKE A MEMORY</Text><Text style={coupleHomeStyles.planTitle}>Choose your next date.</Text><Text style={styles.helper}>Explore nearby cafés, restaurants, activities and complete date packages.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.gold}/></Pressable>}
      <View style={coupleHomeStyles.connectionRow}><View style={{flex:1}}><Text style={coupleHomeStyles.connectionTitle}>Your two-person connection</Text><Text style={styles.helper}>No contacts are uploaded. Connection requires an exact phone search and your partner's approval.</Text></View><Pressable onPress={connected?onShare:onManage} style={coupleHomeStyles.connectionButton}><Ionicons name={connected?'share-social-outline':incomingCount?'mail-unread-outline':'search-outline'} size={17} color={colors.gold}/><Text style={coupleHomeStyles.connectionButtonText}>{connected?'Share app':incomingCount?'Review':'Find partner'}</Text></Pressable></View>
    </ScrollView>
    <BottomNav active="home" mode="couple" onOpenTool={onOpenTool} navigate={navigate}/>
  </SafeAreaView></LinearGradient>
}

function IntentPassportCard({input,compact=false,onEdit}:{input:IntentPassportInput;compact?:boolean;onEdit:()=>void}){
  const passport=buildIntentPassport(input);
  const visibleFields=compact?passport.fields.slice(0,3):passport.fields;
  return <View style={[passportStyles.card,compact&&passportStyles.cardCompact]}>
    <View style={passportStyles.header}>
      <MiniPremiumIcon name="finger-print-outline" tone="gold" size={compact?34:40} iconSize={compact?16:19}/>
      <View style={{flex:1}}><Text style={styles.sectionLabel}>MY INTENT PASSPORT</Text><Text style={passportStyles.summary}>{passport.summary}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit Intent Passport" onPress={onEdit} style={passportStyles.edit}><Ionicons name="create-outline" size={16} color={colors.gold}/></Pressable>
    </View>
    <View style={passportStyles.fieldGrid}>{visibleFields.map(field=><View key={field.id} style={passportStyles.field}><Text style={passportStyles.fieldLabel}>{field.label}</Text><Text numberOfLines={2} style={[passportStyles.fieldValue,!field.complete&&passportStyles.fieldPrivate]}>{field.value}</Text></View>)}</View>
    {compact&&<Text style={passportStyles.privacy}>Shared deliberately. Never shown as a compatibility percentage.</Text>}
  </View>
}

function ExploreHub({navigate}:{navigate:(screen:Screen)=>void}){
  const {width}=useWindowDimensions();
  const wide=width>=760;
  const tools=[
    {title:'Match preferences',body:'Intent, family, distance and future-plan filters.',icon:'options-outline' as const,tone:'rose' as const,target:'discovery' as Screen},
    {title:'Relationship coach',body:'Thoughtful prompts, profile polish and safety-aware support.',icon:'sparkles-outline' as const,tone:'plum' as const,target:'coach' as Screen},
    {title:'Trusted Circle',body:'Private character vouches from people who know you well.',icon:'people-outline' as const,tone:'gold' as const,target:'circle' as Screen},
    {title:'Trust & verification',body:'Selfie, voice, ID and account trust controls.',icon:'shield-checkmark-outline' as const,tone:'rose' as const,target:'verifyHub' as Screen},
  ];
  return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}><SafeAreaView style={[shared.safe,{maxWidth:920,paddingHorizontal:0}]}>
    <View style={focusStyles.header}><View style={{flex:1}}><Text style={styles.kicker}>DISCOVER WITH INTENTION</Text><Text style={shared.h2}>Your next step</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={()=>navigate('profile')} style={homeCleanStyles.headerButton}><PremiumIcon name="person-outline" tone="ruby" size={36} iconSize={17}/></Pressable></View>
    <ScrollView contentContainerStyle={focusStyles.content} showsVerticalScrollIndicator={false}>
      <View style={focusStyles.journeyRail}>{relationshipJourneySteps.map((step,index)=><React.Fragment key={step.id}><Pressable accessibilityRole="button" accessibilityLabel={`${step.label} stage`} onPress={()=>navigate(step.target as Screen)} style={focusStyles.journeyStep}><MiniPremiumIcon name={step.icon as keyof typeof Ionicons.glyphMap} tone={index===0?'ruby':index===3?'gold':'dark'} size={32} iconSize={15}/><Text style={focusStyles.journeyLabel}>{step.label}</Text></Pressable>{index<relationshipJourneySteps.length-1&&<View style={focusStyles.journeyLine}/>}</React.Fragment>)}</View>
      <View style={[focusStyles.featuredRow,wide&&focusStyles.featuredRowWide]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Executive Circle" onPress={()=>navigate('executive')} style={[focusStyles.executiveCard,wide&&focusStyles.featuredWide]}><LinearGradient colors={['rgba(212,175,55,.18)','rgba(229,9,47,.08)']} style={StyleSheet.absoluteFill}/><View style={focusStyles.featureIcon}><PremiumIcon name="briefcase" tone="gold" size={50} iconSize={23}/></View><View style={{flex:1}}><Text style={styles.kicker}>EXECUTIVE CIRCLE</Text><Text style={focusStyles.featureTitle}>Selective professional introductions.</Text><Text style={focusStyles.featureBody}>Verified career, values and relationship intent for members who prefer a smaller, curated circle.</Text></View><Ionicons name="chevron-forward" size={19} color={colors.gold}/></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open people who liked you" onPress={()=>navigate('likes')} style={[focusStyles.likesCard,wide&&focusStyles.likesWide]}><MiniPremiumIcon name="heart-circle" tone="ruby" size={42} iconSize={20}/><View style={{flex:1}}><Text style={focusStyles.likesTitle}>People who chose you</Text><Text style={focusStyles.featureBody}>Private interest, kept calm and intentional.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted}/></Pressable>
      </View>
      <View style={homeCleanStyles.sectionRow}><Text style={styles.sectionLabel}>SERIOUS DATING TOOLS</Text><Text style={homeCleanStyles.sectionHint}>Private by default</Text></View>
      <View style={[focusStyles.toolGrid,wide&&focusStyles.toolGridWide]}>{tools.map(tool=><ExploreTool key={tool.title} {...tool} wide={wide} onPress={()=>navigate(tool.target)}/>)}</View>
      <View style={focusStyles.boundary}><MiniPremiumIcon name="chatbubbles-outline" tone="gold" size={34} iconSize={16}/><View style={{flex:1}}><Text style={focusStyles.boundaryTitle}>Conversation first</Text><Text style={focusStyles.featureBody}>Gifts, GIFs, games and playful extras stay inside Chat, after a mutual connection.</Text></View></View>
    </ScrollView>
    <BottomNav active="explore" navigate={navigate}/>
  </SafeAreaView></LinearGradient>
}

function ExploreTool({title,body,icon,tone,wide,onPress}:{title:string;body:string;icon:keyof typeof Ionicons.glyphMap;tone:PremiumIconTone;wide:boolean;onPress:()=>void}){
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={[focusStyles.tool,wide&&focusStyles.toolWide]}><MiniPremiumIcon name={icon} tone={tone} size={36} iconSize={17}/><View style={{flex:1}}><Text style={focusStyles.toolTitle}>{title}</Text><Text style={focusStyles.toolBody}>{body}</Text></View><Ionicons name="chevron-forward" size={16} color={colors.muted}/></Pressable>
}

function GrowthNudgeCard({nudge,onPress}:{nudge:GrowthNudge;onPress:()=>void}){
  return <Pressable onPress={onPress} style={growthLoopStyles.nudgeCard}>
    <PremiumIcon name={nudge.icon as keyof typeof Ionicons.glyphMap} tone="gold" size={48} iconSize={22}/>
    <View style={{flex:1}}>
      <Text style={growthLoopStyles.nudgeTitle}>{nudge.title}</Text>
      <Text style={growthLoopStyles.nudgeBody}>{nudge.body}</Text>
    </View>
    <View style={growthLoopStyles.nudgeAction}><Text style={growthLoopStyles.nudgeActionText}>{nudge.actionLabel}</Text></View>
  </Pressable>
}

function GrowthLoopMetric({icon,title,body}:{icon:keyof typeof Ionicons.glyphMap;title:string;body:string}){
  return <View style={growthLoopStyles.metricCard}>
    <MiniPremiumIcon name={icon} tone="rose" size={30} iconSize={14}/>
    <Text style={growthLoopStyles.metricTitle}>{title}</Text>
    <Text style={growthLoopStyles.metricBody}>{body}</Text>
  </View>
}

function RetentionCommandCenter({plan,onPress}:{plan:HomeGrowthLoop['retention'];onPress:(loop:RetentionLoop)=>void}){
  return <View style={growthLoopStyles.commandCard}>
    <View style={growthLoopStyles.commandHeader}>
      <View style={{flex:1}}>
        <Text style={styles.sectionLabel}>RETENTION ENGINE</Text>
        <Text style={growthLoopStyles.commandTitle}>Daily reasons to come back.</Text>
      </View>
      <MiniPremiumIcon name="notifications-outline" tone="gold" size={36} iconSize={17}/>
    </View>
    <View style={growthLoopStyles.retentionStats}>
      <View style={growthLoopStyles.retentionStat}><Text style={growthLoopStyles.retentionValue}>{plan.dailyMatches}</Text><Text style={growthLoopStyles.retentionLabel}>daily matches</Text></View>
      <View style={growthLoopStyles.retentionStat}><Text style={growthLoopStyles.retentionValue}>{plan.weeklyDropCount}</Text><Text style={growthLoopStyles.retentionLabel}>weekly drop</Text></View>
      <View style={growthLoopStyles.retentionStat}><Text style={growthLoopStyles.retentionValue}>10</Text><Text style={growthLoopStyles.retentionLabel}>return loops</Text></View>
    </View>
    <View style={growthLoopStyles.promptCard}>
      <MiniPremiumIcon name="chatbubble-ellipses-outline" tone="rose" size={32} iconSize={15}/>
      <Text style={growthLoopStyles.promptText}>{plan.dailyPrompt}</Text>
    </View>
    <View style={growthLoopStyles.retentionGrid}>
      {plan.loops.map(loop=><Pressable key={loop.id} onPress={()=>onPress(loop)} style={[growthLoopStyles.retentionCard,!loop.active&&growthLoopStyles.retentionCardOff]}>
        <MiniPremiumIcon name={loop.icon as keyof typeof Ionicons.glyphMap} tone={loop.active?'gold':'dark'} size={34} iconSize={16}/>
        <View style={{flex:1}}>
          <Text style={growthLoopStyles.retentionTitle}>{loop.title}</Text>
          <Text style={growthLoopStyles.retentionBody}>{loop.body}</Text>
        </View>
        <View style={[growthLoopStyles.retentionAction,loop.active&&growthLoopStyles.retentionActionOn]}>
          <Text style={growthLoopStyles.retentionActionText}>{loop.actionLabel}</Text>
        </View>
      </Pressable>)}
    </View>
  </View>
}

function NetworkEffectCenter({plan,onPress}:{plan:NetworkEffectPlan;onPress:(loop:NetworkGrowthLoop)=>void}){
  const challenge=plan.inviteChallenge;
  return <View style={growthLoopStyles.networkCard}>
    <View style={growthLoopStyles.commandHeader}>
      <View style={{flex:1}}>
        <Text style={styles.sectionLabel}>NETWORK EFFECT</Text>
        <Text style={growthLoopStyles.commandTitle}>City growth engine.</Text>
        <Text style={growthLoopStyles.networkSub}>Launch density first: {plan.priorityCity.market}</Text>
      </View>
      <MiniPremiumIcon name="git-network-outline" tone="gold" size={38} iconSize={18}/>
    </View>
    <View style={growthLoopStyles.cityRail}>
      {plan.launchCities.map(city=><View key={city.name} style={[growthLoopStyles.cityLaunchChip,city.name===plan.priorityCity.name&&growthLoopStyles.cityLaunchChipOn]}>
        <Text style={growthLoopStyles.cityLaunchName}>{city.name}</Text>
        <Text style={growthLoopStyles.cityLaunchMeta}>{city.currentProfiles} seeded · {city.status}</Text>
      </View>)}
    </View>
    <View style={growthLoopStyles.challengeCard}>
      <View style={{flex:1}}>
        <Text style={growthLoopStyles.challengeTitle}>{challenge.title}</Text>
        <Text style={growthLoopStyles.challengeBody}>{challenge.reward}</Text>
      </View>
      <View style={growthLoopStyles.challengeMeter}><Text style={growthLoopStyles.challengeMeterText}>{challenge.current}/{challenge.target}</Text></View>
    </View>
    <View style={growthLoopStyles.challengeTrack}>{[0,1,2].map(index=><View key={index} style={[growthLoopStyles.challengeStep,index<challenge.current&&growthLoopStyles.challengeStepOn]}/>)}</View>
    <View style={growthLoopStyles.retentionGrid}>
      {plan.loops.map(loop=><Pressable key={loop.id} onPress={()=>onPress(loop)} style={[growthLoopStyles.networkLoop,!loop.active&&growthLoopStyles.retentionCardOff]}>
        <MiniPremiumIcon name={loop.icon as keyof typeof Ionicons.glyphMap} tone={loop.active?'gold':'dark'} size={32} iconSize={15}/>
        <View style={{flex:1}}>
          <Text style={growthLoopStyles.retentionTitle}>{loop.title}</Text>
          <Text style={growthLoopStyles.retentionBody}>{loop.body}</Text>
        </View>
        <View style={[growthLoopStyles.retentionAction,loop.active&&growthLoopStyles.retentionActionOn]}>
          <Text style={growthLoopStyles.retentionActionText}>{loop.actionLabel}</Text>
        </View>
      </Pressable>)}
    </View>
    <View style={growthLoopStyles.storyCard}>
      <MiniPremiumIcon name="heart-circle-outline" tone="rose" size={32} iconSize={15}/>
      <Text style={growthLoopStyles.promptText}>{plan.successStoryPrompts[0]}</Text>
    </View>
  </View>
}

function TrustSignal({icon,title,body}:{icon:keyof typeof Ionicons.glyphMap;title:string;body:string}){
  return <View style={coachStyles.trustItem}><PremiumIcon name={icon} tone="ruby" size={38} iconSize={17}/><View style={{flex:1}}><Text style={coachStyles.trustTitle}>{title}</Text><Text style={coachStyles.trustBody}>{body}</Text></View></View>
}

function TrustBadges({match}:{match:Match}){
  const badges=['Selfie verified','Serious intent verified',`${match.vouches.count} friend vouches`];
  return <View style={coachStyles.badgeCard}><View style={shared.row}><MiniPremiumIcon name="shield-checkmark" tone="gold" size={38} iconSize={18}/><Text style={[styles.cardTitle,{marginLeft:8}]}>Trust profile</Text></View><View style={coachStyles.badgeRow}>{badges.map(badge=><View key={badge} style={coachStyles.badgePill}><MiniPremiumIcon name="checkmark-circle" tone="rose" size={22} iconSize={10}/><Text style={coachStyles.badgeText}>{badge}</Text></View>)}</View><Text style={styles.helper}>Verification reduces fake profiles, but members should still meet publicly and use their own judgment.</Text></View>
}

function Home({items,preferences,roseAvailability,crossedPaths,openDetail,onSkip,onRose,navigate}:{items:Match[];preferences:{intent:string;vibes:string[];filters:MatchFilters};roseAvailability:RoseAvailability;crossedPaths:boolean;openDetail:(m:Match)=>void;onSkip:(m:Match)=>void;onRose:(m:Match)=>void;navigate:(s:Screen)=>void}){return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}><SafeAreaView style={{flex:1}}><View style={styles.homeHead}><View><Text style={styles.kicker}>AI CURATION</Text><Text style={shared.h2}>Your daily matches</Text></View><Pressable onPress={()=>navigate('pricing')} style={homeStyles.packageButton}><Ionicons name="diamond" size={16} color={colors.gold}/><Text style={homeStyles.packageButtonText}>Packages</Text></Pressable><Pressable onPress={()=>navigate('discovery')} style={discoveryStyles.tuneButton}><Ionicons name="options" size={20} color={colors.pinkSoft}/><View style={discoveryStyles.smartDot}/></Pressable><View style={styles.avatar}><Text style={styles.avatarText}>A</Text><View style={styles.online}/></View></View><ScrollView contentContainerStyle={{padding:18,paddingBottom:110,gap:18}} showsVerticalScrollIndicator={false}><Pressable onPress={()=>navigate('pricing')} style={homeStyles.packageCard}><LinearGradient colors={['rgba(212,175,55,.18)','rgba(229,9,47,.10)']} style={StyleSheet.absoluteFill}/><View style={homeStyles.packageIcon}><Ionicons name="sparkles" size={22} color={colors.gold}/></View><View style={{flex:1}}><Text style={styles.cardTitle}>Packages, Sparks & visibility</Text><Text style={styles.helper}>Upgrade for more curated matches, likes, and Spark packs. {roseAvailability.paidCredits} Sparks in wallet.</Text></View><Ionicons name="chevron-forward" size={19} color={colors.gold}/></Pressable><Pressable onPress={()=>navigate('circle')} style={circleStyles.homeBanner}><View style={circleStyles.bannerFaces}><View style={[circleStyles.tinyFace,{backgroundColor:'#7F1D68'}]}><Text style={circleStyles.tinyInitial}>S</Text></View><View style={[circleStyles.tinyFace,{backgroundColor:'#42307D',marginLeft:-9}]}><Text style={circleStyles.tinyInitial}>R</Text></View><View style={circleStyles.tinyPlus}><Ionicons name="add" size={14} color={colors.ivory}/></View></View><View style={{flex:1}}><Text style={circleStyles.bannerTitle}>Build your Trusted Circle</Text><Text style={circleStyles.bannerBody}>Friends vouch. You earn trust—and 100 gift coins.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.pinkSoft}/></Pressable>{crossedPaths&&<View style={discoveryStyles.crossedSection}><View style={shared.row}><View><Text style={styles.kicker}>CROSSED PATHS</Text><Text style={styles.cardTitle}>You were nearby</Text></View><View style={shared.spacer}/><Pressable onPress={()=>navigate('discovery')}><Text style={discoveryStyles.manageText}>Manage</Text></Pressable></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10}}>{items.slice(0,2).map((match,index)=><Pressable key={match.id} onPress={()=>openDetail(match)} style={discoveryStyles.crossedCard}><Image source={{uri:match.photo}} style={discoveryStyles.crossedImage}/><LinearGradient colors={['transparent','rgba(13,3,12,.92)']} style={StyleSheet.absoluteFill}/><View style={discoveryStyles.crossedInfo}><Text style={discoveryStyles.crossedName}>{match.name}, {match.age}</Text><Text style={discoveryStyles.crossedMeta}>{index?'Yesterday':'2h ago'} · within 1 mile area</Text></View></Pressable>)}</ScrollView></View>}<View style={aiStyles.aiCard}><View style={shared.row}><View style={aiStyles.aiSpark}><Ionicons name="sparkles" size={18} color={colors.ivory}/></View><View style={{flex:1}}><Text style={styles.cardTitle}>AI Match Lens</Text><Text style={styles.helper}>Sorted by your intent, family values, location filters and in-app signals only.</Text></View></View><View style={aiStyles.aiPills}>{[preferences.filters.familyPriority==='high'?'Family-first priority':preferences.intent||'Intent aligned',`${preferences.filters.minAge}-${preferences.filters.maxAge}`,preferences.filters.lookingFor,preferences.filters.distancePreference.replaceAll('_',' ')].map(item=><View key={item} style={aiStyles.aiPill}><Text style={aiStyles.aiPillText}>{item}</Text></View>)}</View></View><View style={styles.curated}><Ionicons name="shield-checkmark-outline" color={colors.pinkSoft} size={17}/><Text style={styles.curatedText}>Privacy-safe AI · never phone search history</Text><Text style={styles.curatedCount}>{items.length}</Text></View>{items.length?items.map(match=><MatchCard key={match.id} match={match} reasons={matchReasons(match,preferences)} onPress={()=>openDetail(match)} onInterested={()=>openDetail(match)} onSkip={()=>onSkip(match)} onRose={()=>onRose(match)}/>):<View style={[shared.card,{gap:12,alignItems:'center'}]}><Ionicons name="options-outline" size={30} color={colors.pinkSoft}/><Text style={styles.cardTitle}>No profiles match these filters</Text><Text style={[styles.helper,{textAlign:'center'}]}>Try widening age, city, vibe or family filters.</Text><Button label="Adjust filters" onPress={()=>navigate('discovery')}/></View>}</ScrollView><BottomNav active="home" navigate={navigate}/></SafeAreaView></LinearGradient>}

function TrustedCircle({vouches,coinBalance,rewardMode,onBack,onAddVouch}:{vouches:string[];coinBalance:number;rewardMode:'live'|'demo'|'blocked';onBack:()=>void;onAddVouch:(quality:string)=>void}){
  const [inviteStatus,setInviteStatus]=useState('');
  const shareInvite=async()=>{setInviteStatus('');try{await Share.share({title:'Vouch for me on DestinyOne',message:'I’m building my Trusted Circle on DestinyOne. Would you vouch for the qualities you genuinely know me for? https://destinyone.app/vouch/demo'})}catch{setInviteStatus('Share sheet is not available in this browser preview. Demo invite: https://destinyone.app/vouch/demo')}};
  const demoQualities=['Dependable','Emotionally mature','Family-minded'];
  return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}><SafeAreaView style={shared.safe}><View style={circleStyles.circleHeader}><Pressable onPress={onBack} style={styles.backButton}><Ionicons name="arrow-back" size={21} color={colors.ivory}/></Pressable><View style={shared.spacer}/>{rewardMode==='demo'&&<View style={circleStyles.coinBalance}><Ionicons name="sparkles" size={14} color={colors.gold}/><Text style={circleStyles.coinBalanceText}>{coinBalance}</Text></View>}</View><ScrollView contentContainerStyle={circleStyles.circleContent} showsVerticalScrollIndicator={false}><View style={circleStyles.circleHero}><View style={circleStyles.circleOrbit}><View style={[circleStyles.friendAvatar,{left:2,top:42,backgroundColor:'#7F1D68'}]}><Text style={circleStyles.friendInitial}>S</Text></View><View style={[circleStyles.friendAvatar,{right:2,top:42,backgroundColor:'#42307D'}]}><Text style={circleStyles.friendInitial}>R</Text></View><View style={circleStyles.userCircle}><Text style={circleStyles.userInitial}>A</Text><View style={circleStyles.trustCheck}><Ionicons name="checkmark" size={16} color={colors.ivory}/></View></View></View><Text style={styles.kicker}>TRUSTED CIRCLE</Text><Text style={[shared.h1,{textAlign:'center'}]}>The people who know you, know your heart.</Text><Text style={[shared.body,{textAlign:'center'}]}>Invite up to 3 close friends to vouch for your character—not your dating choices.</Text></View><View style={coachStyles.trustStrip}><TrustSignal icon="camera" title="Selfie verification" body="Confirms profile photo belongs to the person creating the account."/><TrustSignal icon="id-card" title="Optional ID check" body="Production can add ID verification for higher trust badges."/><TrustSignal icon="people" title="Friend vouches" body="Character vouches show reliability without exposing private dating activity."/><TrustSignal icon="calendar" title="Safer date check-ins" body="Public date plans and check-ins help members feel safer meeting offline."/></View><View style={circleStyles.progressCard}><View style={shared.row}><Text style={styles.cardTitle}>Your circle</Text><View style={shared.spacer}/><Text style={circleStyles.progressCount}>{vouches.length}/3 vouched</Text></View><View style={circleStyles.vouchProgress}>{[0,1,2].map(index=><View key={index} style={[circleStyles.vouchProgressStep,index<vouches.length&&circleStyles.vouchProgressOn]}/>)}</View>{vouches.length?<View style={circleStyles.qualityWrap}>{vouches.map(value=><View key={value} style={circleStyles.qualityPill}><Ionicons name="checkmark" size={12} color={colors.pinkSoft}/><Text style={circleStyles.qualityText}>{value}</Text></View>)}</View>:<Text style={styles.helper}>No vouches yet. Your friends answer privately from the invite link.</Text>}</View><Button label="Invite a trusted friend" icon="share-social" onPress={()=>void shareInvite()}/>{!!inviteStatus&&<View style={circleStyles.boundaryCard}><Ionicons name="link" size={22} color={colors.gold}/><Text style={[styles.helper,{flex:1}]}>{inviteStatus}</Text></View>}<View style={circleStyles.rewardCard}><View style={circleStyles.rewardIcon}><Ionicons name="gift" size={23} color={colors.gold}/></View><View style={{flex:1}}><Text style={styles.cardTitle}>{rewardMode==='demo'?'100 demo coins per completed vouch':'Verified rewards connection required'}</Text><Text style={styles.helper}>{rewardMode==='demo'?'Preview rewards update only this device.':'No local reward balance changes until verified invite completion and server billing are connected.'}</Text></View></View>{rewardMode==='demo'?<View style={circleStyles.demoCard}><Text style={styles.sectionLabel}>MVP PREVIEW</Text><Text style={styles.helper}>Simulate a friend response to preview how trust qualities appear.</Text><View style={circleStyles.qualityWrap}>{demoQualities.map(quality=><Pressable disabled={vouches.includes(quality)||vouches.length>=3} onPress={()=>onAddVouch(quality)} key={quality} style={[circleStyles.demoQuality,vouches.includes(quality)&&{opacity:.4}]}><Text style={circleStyles.demoQualityText}>{quality}</Text><Ionicons name="add-circle" size={16} color={colors.pink}/></Pressable>)}</View></View>:<View style={circleStyles.demoCard}><Text style={styles.sectionLabel}>SECURE VERIFICATION REQUIRED</Text><Text style={styles.helper}>Friend responses and rewards stay unavailable until the verified invite backend is active.</Text></View>}<View style={circleStyles.boundaryCard}><Ionicons name="shield-checkmark" size={22} color={colors.pinkSoft}/><Text style={[styles.helper,{flex:1}]}>Friends cannot view your matches, messages, likes, or private preferences. You remain fully in control.</Text></View></ScrollView></SafeAreaView></LinearGradient>
}

function DiscoveryCenterLegacy({filters,onFiltersChange,signals,smartDiscovery,crossedPaths,onSmartChange,onCrossedChange,onClear,onBack}:{filters:MatchFilters;onFiltersChange:(filters:MatchFilters)=>void;signals:DiscoverySignal[];smartDiscovery:boolean;crossedPaths:boolean;onSmartChange:(value:boolean)=>void;onCrossedChange:(value:boolean)=>void;onClear:()=>void;onBack:()=>void}){
  const [locationError,setLocationError]=useState('');
  const toggleCrossed=async()=>{
    if(crossedPaths){onCrossedChange(false);return}
    setLocationError('');
    const permission=await Location.requestForegroundPermissionsAsync();
    if(!permission.granted){setLocationError('Approximate location permission is needed for Crossed Paths.');return}
    try{await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Low});onCrossedChange(true)}catch{setLocationError('Location is unavailable right now. Please try again outdoors.')}
  };
  const views=signals.filter(signal=>signal.type==='view').length;
  const likes=signals.filter(signal=>signal.type==='interested').length;
  const skips=signals.filter(signal=>signal.type==='skip').length;
  const update=(patch:Partial<MatchFilters>)=>onFiltersChange({...filters,...patch});
  const toggleArray=(key:'intents'|'mustHaveVibes'|'cities',value:string)=>{const current=filters[key];update({[key]:current.includes(value)?current.filter(item=>item!==value):[...current,value]} as Partial<MatchFilters>)};
  return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}><SafeAreaView style={shared.safe}><View style={discoveryStyles.header}><Pressable onPress={onBack} style={styles.backButton}><Ionicons name="arrow-back" size={21} color={colors.ivory}/></Pressable><Text style={[styles.cardTitle,{marginLeft:12}]}>AI filters & privacy</Text></View><ScrollView contentContainerStyle={discoveryStyles.content} showsVerticalScrollIndicator={false}><SectionTitle eyebrow="Your choices, your control" title="Smarter matches without spying." body="DestinyOne learns only from what you choose inside the app. You can pause or erase this learning anytime."/><View style={aiStyles.filterCard}><View style={shared.row}><Ionicons name="sparkles" size={21} color={colors.gold}/><Text style={[styles.cardTitle,{marginLeft:8}]}>Detailed match filters</Text><View style={shared.spacer}/><Pressable onPress={()=>onFiltersChange(defaultMatchFilters)}><Text style={discoveryStyles.manageText}>Reset</Text></Pressable></View><FilterSection title="Looking for">{(['Women','Men','Everyone'] as const).map(option=><FilterChip key={option} label={option} active={filters.lookingFor===option} onPress={()=>update({lookingFor:option})}/>)}</FilterSection><FilterSection title={`Age range · ${filters.minAge}-${filters.maxAge}`}><FilterChip label="25-30" active={filters.minAge===25&&filters.maxAge===30} onPress={()=>update({minAge:25,maxAge:30})}/><FilterChip label="25-35" active={filters.minAge===25&&filters.maxAge===35} onPress={()=>update({minAge:25,maxAge:35})}/><FilterChip label="30-35" active={filters.minAge===30&&filters.maxAge===35} onPress={()=>update({minAge:30,maxAge:35})}/></FilterSection><FilterSection title="Relationship intent">{['Marriage','Long-term, leading to Marriage','Long-term Relationship'].map(option=><FilterChip key={option} label={option} active={filters.intents.includes(option)} onPress={()=>toggleArray('intents',option)}/>)}</FilterSection><FilterSection title="Family priority"><FilterChip label="Any" active={filters.familyPriority==='any'} onPress={()=>update({familyPriority:'any'})}/><FilterChip label="Family First" active={filters.familyPriority==='high'} onPress={()=>update({familyPriority:'high'})}/><FilterChip label="Balanced" active={filters.familyPriority==='balanced'} onPress={()=>update({familyPriority:'balanced'})}/></FilterSection><FilterSection title="Future plans"><FilterChip label="Any children plan" active={filters.children==='any'} onPress={()=>update({children:'any'})}/><FilterChip label="Wants children" active={filters.children==='wants'} onPress={()=>update({children:'wants'})}/><FilterChip label="Open to children" active={filters.children==='open'} onPress={()=>update({children:'open'})}/><FilterChip label="Marriage 1-2 yrs" active={filters.marriageTimeline==='1_2_years'} onPress={()=>update({marriageTimeline:'1_2_years'})}/><FilterChip label="Marriage 2-3 yrs" active={filters.marriageTimeline==='2_3_years'} onPress={()=>update({marriageTimeline:'2_3_years'})}/></FilterSection><FilterSection title="Must-have vibe">{vibes.map(option=><FilterChip key={option} label={option} active={filters.mustHaveVibes.includes(option)} onPress={()=>toggleArray('mustHaveVibes',option)}/>)}</FilterSection><FilterSection title="City focus">{['New York','Austin','Chicago','Seattle','San Francisco'].map(option=><FilterChip key={option} label={option} active={filters.cities.includes(option)} onPress={()=>toggleArray('cities',option)}/>)}</FilterSection><FilterSection title="Relocation"><FilterChip label="Any" active={filters.relocation==='any'} onPress={()=>update({relocation:'any'})}/><FilterChip label="Open to relocate" active={filters.relocation==='open'} onPress={()=>update({relocation:'open'})}/><FilterChip label="Prefers same city" active={filters.relocation==='same_city'} onPress={()=>update({relocation:'same_city'})}/></FilterSection></View><View style={discoveryStyles.neverTrack}><Ionicons name="eye-off-outline" size={25} color={colors.pinkSoft}/><View style={{flex:1}}><Text style={styles.cardTitle}>What we never read</Text><Text style={styles.helper}>Browser or Google searches, messages outside DestinyOne, contacts, photos you don’t select, microphone activity, or usage in other apps.</Text></View></View><DiscoveryToggle icon="sparkles" title="Smart Discovery" body="Reorders daily matches using your stated preferences, profile views, interests and skips." value={smartDiscovery} onPress={()=>onSmartChange(!smartDiscovery)}/><DiscoveryToggle icon="walk" title="Crossed Paths" body="Shows opted-in members whose approximate area overlapped with yours. Exact place and time stay hidden." value={crossedPaths} onPress={()=>void toggleCrossed()}/>{!!locationError&&<Text style={styles.formError}>{locationError}</Text>}<View style={discoveryStyles.activityCard}><View style={shared.row}><Text style={styles.cardTitle}>Your in-app activity</Text><View style={shared.spacer}/><Text style={styles.helper}>On this device</Text></View><View style={discoveryStyles.stats}><DiscoveryStat value={views} label="Profiles viewed"/><DiscoveryStat value={likes} label="Interested"/><DiscoveryStat value={skips} label="Skipped"/></View><Pressable disabled={!signals.length} onPress={onClear} style={[discoveryStyles.clearButton,!signals.length&&{opacity:.4}]}><Ionicons name="trash-outline" size={17} color={colors.danger}/><Text style={discoveryStyles.clearText}>Clear activity and reset learning</Text></Pressable></View><View style={aiStyles.privacyPolicyCard}><Ionicons name="lock-closed" size={22} color={colors.gold}/><View style={{flex:1}}><Text style={styles.cardTitle}>AI Privacy Policy</Text><Text style={styles.helper}>Your filters and in-app signals improve ranking. Exact scores stay internal, and you can reset learning anytime.</Text></View></View><View style={discoveryStyles.privacyGrid}><PrivacyPoint icon="location-outline" title="Approximate only" body="Low-accuracy location is used; raw coordinates are not saved in this MVP."/><PrivacyPoint icon="people-outline" title="Both must opt in" body="You appear in Crossed Paths only when both members enable it."/><PrivacyPoint icon="time-outline" title="Delayed display" body="Profiles appear later, never as a live location tracker."/><PrivacyPoint icon="shield-checkmark-outline" title="Block always wins" body="Blocked or reported members never appear in discovery."/></View></ScrollView></SafeAreaView></LinearGradient>
}

function DiscoveryCenter({filters,onFiltersChange,signals,smartDiscovery,crossedPaths,onSmartChange,onCrossedChange,onClear,onBack}:{filters:MatchFilters;onFiltersChange:(filters:MatchFilters)=>void;signals:DiscoverySignal[];smartDiscovery:boolean;crossedPaths:boolean;onSmartChange:(value:boolean)=>void;onCrossedChange:(value:boolean)=>void;onClear:()=>void;onBack:()=>void}){
  const [locationError,setLocationError]=useState('');
  const [citySearch,setCitySearch]=useState('');
  const views=signals.filter(signal=>signal.type==='view').length;
  const likes=signals.filter(signal=>signal.type==='interested').length;
  const skips=signals.filter(signal=>signal.type==='skip').length;
  const update=(patch:Partial<MatchFilters>)=>onFiltersChange({...filters,...patch});
  const toggleArray=(key:'intents'|'mustHaveVibes'|'cities',value:string)=>{const current=filters[key];update({[key]:current.includes(value)?current.filter(item=>item!==value):[...current,value]} as Partial<MatchFilters>)};
  const cityOptions=(citySearch?profileCities.filter(city=>city.toLowerCase().includes(citySearch.toLowerCase())):profileCities).slice(0,42);
  const selectedLaunchMarkets=[...new Map(filters.cities.map(city=>resolveLaunchMarket(city)).filter(Boolean).map(market=>[market!.name,market!])).values()];
  const toggleCrossed=async()=>{
    if(crossedPaths){onCrossedChange(false);return}
    setLocationError('');
    const permission=await Location.requestForegroundPermissionsAsync();
    if(!permission.granted){setLocationError('Approximate location permission is needed for Crossed Paths.');return}
    try{await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Low});onCrossedChange(true)}catch{setLocationError('Location is unavailable right now. Please try again outdoors.')}
  };
  return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}><SafeAreaView style={shared.safe}><View style={discoveryStyles.header}><Pressable onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable><Text style={[styles.cardTitle,{marginLeft:12}]}>AI filters & privacy</Text></View><ScrollView contentContainerStyle={discoveryStyles.content} showsVerticalScrollIndicator={false}>
    <SectionTitle eyebrow="Your choices, your control" title="Smarter matches without spying." body="DestinyOne learns from your filters, profile views and in-app actions only. You can reset this anytime."/>
    <View style={aiStyles.filterCard}>
      <View style={shared.row}><PremiumIcon name="sparkles" tone="gold" size={42} iconSize={19}/><Text style={[styles.cardTitle,{marginLeft:10}]}>Detailed match filters</Text><View style={shared.spacer}/><Pressable onPress={()=>onFiltersChange(defaultMatchFilters)} style={premiumButtonStyles.smallGhost}><Text style={discoveryStyles.manageText}>Reset</Text></Pressable></View>
      <FilterSection title="Looking for">{(['Women','Men','Everyone'] as const).map(option=><FilterChip key={option} label={option} active={filters.lookingFor===option} onPress={()=>update({lookingFor:option})}/>)}</FilterSection>
      <FilterSection title={`Age range · ${filters.minAge}-${filters.maxAge}`}><FilterChip label="25-30" active={filters.minAge===25&&filters.maxAge===30} onPress={()=>update({minAge:25,maxAge:30})}/><FilterChip label="25-35" active={filters.minAge===25&&filters.maxAge===35} onPress={()=>update({minAge:25,maxAge:35})}/><FilterChip label="30-35" active={filters.minAge===30&&filters.maxAge===35} onPress={()=>update({minAge:30,maxAge:35})}/></FilterSection>
      <FilterSection title="Relationship intent">{['Marriage','Long-term, leading to Marriage','Long-term Relationship'].map(option=><FilterChip key={option} label={option} active={filters.intents.includes(option)} onPress={()=>toggleArray('intents',option)}/>)}</FilterSection>
      <FilterSection title="Family priority"><FilterChip label="Any" active={filters.familyPriority==='any'} onPress={()=>update({familyPriority:'any'})}/><FilterChip label="Family First" active={filters.familyPriority==='high'} onPress={()=>update({familyPriority:'high'})}/><FilterChip label="Balanced" active={filters.familyPriority==='balanced'} onPress={()=>update({familyPriority:'balanced'})}/></FilterSection>
      <FilterSection title="Future plans"><FilterChip label="Any children plan" active={filters.children==='any'} onPress={()=>update({children:'any'})}/><FilterChip label="Wants children" active={filters.children==='wants'} onPress={()=>update({children:'wants'})}/><FilterChip label="Open to children" active={filters.children==='open'} onPress={()=>update({children:'open'})}/><FilterChip label="Marriage 1-2 yrs" active={filters.marriageTimeline==='1_2_years'} onPress={()=>update({marriageTimeline:'1_2_years'})}/><FilterChip label="Marriage 2-3 yrs" active={filters.marriageTimeline==='2_3_years'} onPress={()=>update({marriageTimeline:'2_3_years'})}/></FilterSection>
      <FilterSection title="Must-have vibe">{vibes.map(option=><FilterChip key={option} label={option} active={filters.mustHaveVibes.includes(option)} onPress={()=>toggleArray('mustHaveVibes',option)}/>)}</FilterSection>
      <View style={{gap:8}}><Text style={styles.sectionLabel}>CITY / LOCATION</Text><View style={selectorStyles.searchBox}><MiniPremiumIcon name="search" tone="rose" size={32} iconSize={15}/><TextInput value={citySearch} onChangeText={setCitySearch} placeholder="Search USA or Canada city" placeholderTextColor="#6F6875" style={selectorStyles.searchInput}/></View><View style={aiStyles.filterWrap}>{cityOptions.map(option=><FilterChip key={option} label={option} active={filters.cities.includes(option)} onPress={()=>toggleArray('cities',option)}/>)}</View></View>
      <FilterSection title="Location preference"><FilterChip label="Anywhere" active={filters.distancePreference==='anywhere'} onPress={()=>update({distancePreference:'anywhere'})}/><FilterChip label="Selected cities only" active={filters.distancePreference==='selected_cities'} onPress={()=>update({distancePreference:'selected_cities'})}/><FilterChip label="Same state/province" active={filters.distancePreference==='same_state'} onPress={()=>update({distancePreference:'same_state'})}/><FilterChip label="Open to relocate" active={filters.distancePreference==='open_to_relocate'} onPress={()=>update({distancePreference:'open_to_relocate'})}/></FilterSection>
      <FilterSection title="Relocation"><FilterChip label="Any" active={filters.relocation==='any'} onPress={()=>update({relocation:'any'})}/><FilterChip label="Open to relocate" active={filters.relocation==='open'} onPress={()=>update({relocation:'open'})}/><FilterChip label="Prefers same city" active={filters.relocation==='same_city'} onPress={()=>update({relocation:'same_city'})}/></FilterSection>
    </View>
    <CityCoverageCard selectedCities={filters.cities} launchMarkets={selectedLaunchMarkets}/>
    <View style={discoveryStyles.neverTrack}><PremiumIcon name="eye-off-outline" tone="ruby" size={50} iconSize={23}/><View style={{flex:1}}><Text style={styles.cardTitle}>What we never read</Text><Text style={styles.helper}>Browser or Google searches, messages outside DestinyOne, contacts, photos you don’t select, microphone activity, or usage in other apps.</Text></View></View>
    <DiscoveryToggle icon="sparkles" title="Smart Discovery" body="Reorders daily matches using your stated preferences, profile views, interests and skips." value={smartDiscovery} onPress={()=>onSmartChange(!smartDiscovery)}/>
    <DiscoveryToggle icon="walk" title="Crossed Paths" body="Shows opted-in members whose approximate area overlapped with yours. Exact place and time stay hidden." value={crossedPaths} onPress={()=>void toggleCrossed()}/>
    {!!locationError&&<Text style={styles.formError}>{locationError}</Text>}
    <View style={discoveryStyles.activityCard}><View style={shared.row}><Text style={styles.cardTitle}>Your in-app activity</Text><View style={shared.spacer}/><Text style={styles.helper}>On this device</Text></View><View style={discoveryStyles.stats}><DiscoveryStat value={views} label="Profiles viewed"/><DiscoveryStat value={likes} label="Interested"/><DiscoveryStat value={skips} label="Skipped"/></View><Pressable disabled={!signals.length} onPress={onClear} style={[discoveryStyles.clearButton,!signals.length&&{opacity:.4}]}><PremiumIcon name="trash-outline" tone="ruby" size={30} iconSize={13}/><Text style={discoveryStyles.clearText}>Clear activity and reset learning</Text></Pressable></View>
    <View style={aiStyles.privacyPolicyCard}><PremiumIcon name="lock-closed" tone="gold" size={46} iconSize={20}/><View style={{flex:1}}><Text style={styles.cardTitle}>AI Privacy Policy</Text><Text style={styles.helper}>Your filters and in-app signals improve ranking. Exact scores stay internal, and you can reset learning anytime.</Text></View></View>
    <View style={discoveryStyles.privacyGrid}><PrivacyPoint icon="location-outline" title="Approximate only" body="Location filters are preference-based; Crossed Paths uses low-accuracy foreground location only."/><PrivacyPoint icon="people-outline" title="Both must opt in" body="You appear in Crossed Paths only when both members enable it."/><PrivacyPoint icon="time-outline" title="Delayed display" body="Profiles appear later, never as a live location tracker."/><PrivacyPoint icon="shield-checkmark-outline" title="Block always wins" body="Blocked or reported members never appear in discovery."/></View>
  </ScrollView></SafeAreaView></LinearGradient>
}

function CityCoverageCard({selectedCities,launchMarkets}:{selectedCities:string[];launchMarkets:ReturnType<typeof resolveLaunchMarket>[]}){
  const validMarkets=launchMarkets.filter((market):market is NonNullable<typeof market>=>Boolean(market));
  return <View style={cityDensityStyles.memberCard}>
    <View style={shared.row}><PremiumIcon name="location" tone="gold" size={46} iconSize={21}/><View style={{flex:1,marginLeft:10}}><Text style={styles.kicker}>CITY AVAILABILITY</Text><Text style={styles.cardTitle}>{selectedCities.length?'Your selected communities':'Choose where you want to build'}</Text></View></View>
    <Text style={styles.helper}>{selectedCities.length?`${selectedCities.length} location${selectedCities.length===1?'':'s'} selected. Reciprocal matches are prioritized within your choices and relocation preference.`:'Search any USA or Canada city above. Launch communities open gradually when verified supply is balanced.'}</Text>
    {!!validMarkets.length&&<View style={cityDensityStyles.memberMarketList}>{validMarkets.map(market=><View key={market.name} style={cityDensityStyles.memberMarketRow}><MiniPremiumIcon name="people-outline" tone="rose" size={28} iconSize={13}/><View style={{flex:1}}><Text style={cityDensityStyles.memberMarketName}>{market.market}</Text><Text style={cityDensityStyles.memberMarketMeta}>Founding community · verified members first</Text></View></View>)}</View>}
    <View style={cityDensityStyles.privacyRow}><MiniPremiumIcon name="shield-checkmark-outline" tone="gold" size={26} iconSize={12}/><Text style={cityDensityStyles.privacyText}>No exact coordinates are used for city filters. Crossed Paths stays separately opt-in and approximate.</Text></View>
  </View>
}

function DiscoveryToggle({icon,title,body,value,onPress}:{icon:keyof typeof Ionicons.glyphMap;title:string;body:string;value:boolean;onPress:()=>void}){return <Pressable onPress={onPress} style={discoveryStyles.toggleCard}><PremiumIcon name={icon} tone={value?'gold':'ruby'} size={52} iconSize={23}/><View style={{flex:1}}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View><View style={[discoveryStyles.switch,value&&discoveryStyles.switchOn]}><View style={[discoveryStyles.switchThumb,value&&discoveryStyles.switchThumbOn]}/></View></Pressable>}
function FilterSection({title,children}:{title:string;children:React.ReactNode}){return <View style={aiStyles.filterSection}><Text style={styles.sectionLabel}>{title.toUpperCase()}</Text><View style={aiStyles.filterWrap}>{children}</View></View>}
function FilterChip({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:active}} onPress={onPress} style={[aiStyles.filterChip,active&&aiStyles.filterChipOn]}><Text style={[aiStyles.filterChipText,active&&{color:colors.ivory}]}>{label}</Text>{active&&<MiniPremiumIcon name="checkmark-circle" tone="gold" size={24} iconSize={11}/>}</Pressable>}
function DiscoveryStat({value,label}:{value:number;label:string}){return <View style={discoveryStyles.stat}><Text style={discoveryStyles.statValue}>{value}</Text><Text style={discoveryStyles.statLabel}>{label}</Text></View>}
function PrivacyPoint({icon,title,body}:{icon:keyof typeof Ionicons.glyphMap;title:string;body:string}){return <View style={discoveryStyles.privacyPoint}><PremiumIcon name={icon} tone="ruby" size={38} iconSize={17}/><Text style={discoveryStyles.privacyTitle}>{title}</Text><Text style={discoveryStyles.privacyBody}>{body}</Text></View>}

const coachCards=[
  {title:'Profile polish',icon:'person-circle' as const,body:'Rewrite your bio so it sounds warm, serious and real—not generic.'},
  {title:'First-message helper',icon:'chatbubble-ellipses' as const,body:'Get a thoughtful opener based on values, city and profile details.'},
  {title:'Red-flag scan',icon:'warning' as const,body:'Check for pressure, money requests, inconsistent intent or unsafe meeting patterns.'},
  {title:'Post-date reflection',icon:'heart-circle' as const,body:'After a date, log what felt safe, exciting, unclear and worth exploring.'},
];

const eventExperiences=[
  {title:'Rooftop Chai Mixer',city:'New York, NY',date:'Friday · 7 PM',type:'In person',icon:'☕',tag:'Verified members only',body:'A calm 40-person Indian singles mixer with conversation prompts, safety hosts and clear intent badges.'},
  {title:'Gujarati Garba Social',city:'New Jersey / New York',date:'Saturday · 6 PM',type:'In person',icon:'💃🏽',tag:'Community-led',body:'Culture-first evening for serious singles who want family-friendly energy without old-school pressure.'},
  {title:'Punjabi Culture Night',city:'Toronto, ON',date:'Saturday · 6 PM',type:'In person',icon:'🎶',tag:'Community-led',body:'Music, food and serious singles who value family, culture and long-term compatibility.'},
  {title:'South Asian Professionals Mixer',city:'San Francisco, CA',date:'Thursday · 7 PM',type:'In person',icon:'🤝',tag:'Career + values',body:'Small groups for Indian, Punjabi and American professionals who want real relationships, not casual swiping.'},
  {title:'Video Speed Dates',city:'USA / Canada',date:'Sunday · 5 PM',type:'Online',icon:'🎥',tag:'7-minute rounds',body:'Private video rounds before anyone can ask for a phone number. Chat unlocks only after mutual interest.'},
  {title:'Marriage-minded Speed Dating',city:'Dallas, TX',date:'Sunday · 4 PM',type:'Hybrid',icon:'💍',tag:'Intent verified',body:'Quick values-led intros with serious relationship and marriage filters checked before the event.'},
  {title:'Premium Invite-only Dinner',city:'Los Angeles, CA',date:'Friday · 8 PM',type:'Private dinner',icon:'🍽️',tag:'Limited seats',body:'Eight verified members, hosted table, premium venue and gentle post-event concierge follow-up.'},
  {title:'Executive Private Dinner',city:'New York, NY',date:'Monthly',type:'Invite only',icon:'🥂',tag:'Executive Circle',body:'Founder and business-owner dinner for members approved through Executive Circle verification.'},
];
const coupleExperiences=[
  {title:'Candlelight Jazz Night',city:'Toronto, ON',date:'Friday · 8 PM',type:'Live experience',icon:'🎷',tag:'Couples welcome',body:'Reserved seating, live jazz and an easy after-show dessert route for a complete evening.'},
  {title:'Clay & Chai Workshop',city:'USA / Canada',date:'Saturday · 3 PM',type:'Creative date',icon:'🎨',tag:'Small groups',body:'A guided pottery session with chai, shared prompts and a keepsake you make together.'},
  {title:'Night Market Passport',city:'New York / Toronto',date:'Saturday · 6 PM',type:'Food experience',icon:'🥟',tag:'Flexible arrival',body:'A curated tasting route with partner challenges, public meeting points and flexible pacing.'},
  {title:'Couples Cooking Table',city:'Vancouver, BC',date:'Sunday · 5 PM',type:'Hosted class',icon:'🍳',tag:'Limited seats',body:'Cook a South Asian menu together at a hosted public studio, then sit down for dinner.'},
];

type PlaceKind='Restaurant'|'Cafe'|'Hotel'|'Wellness'|'Tourist'|'Activity'|'Park'|'Dessert'|'Lounge'|'Cultural';
type PlaceItem={id:string;name:string;city:string;country:'USA'|'Canada';kind:PlaceKind;area:string;price:string;vibe:string;bestTime:string;safety:string;icon:string;tags:string[];rating?:number;ratingCount?:number;photo?:string;mapsUrl?:string};
type DatePackage={id:string;title:string;tier:string;city:string;price:string;duration:string;includes:string[];safety:string;icon:keyof typeof Ionicons.glyphMap};
type PartnerRequest={venue:string;city:string;contact:string;packageTitle:string};
type CoupleBundle={id:string;title:string;city:string;price:string;priceCents:number;duration:string;mood:string;icon:keyof typeof Ionicons.glyphMap;includes:string[];flexibility:string;safety:string};
const placeKinds:('All'|PlaceKind)[]=['All','Restaurant','Cafe','Hotel','Wellness','Tourist','Activity','Park','Dessert','Lounge','Cultural'];
const placeCities=['All','New York, NY','Los Angeles, CA','Chicago, IL','Houston, TX','Dallas, TX','Austin, TX','San Francisco, CA','Seattle, WA','Miami, FL','Boston, MA','Washington, DC','San Diego, CA','Atlanta, GA','Denver, CO','Las Vegas, NV','Orlando, FL','Toronto, ON','Vancouver, BC','Montreal, QC','Calgary, AB','Ottawa, ON'];
const cityCoordinates:Record<string,{latitude:number;longitude:number}>={
  'Toronto, ON':{latitude:43.6532,longitude:-79.3832},'Mississauga, ON':{latitude:43.5890,longitude:-79.6441},'Brampton, ON':{latitude:43.7315,longitude:-79.7624},'Markham, ON':{latitude:43.8561,longitude:-79.3370},'Vaughan, ON':{latitude:43.8361,longitude:-79.4983},'Oakville, ON':{latitude:43.4675,longitude:-79.6877},'Burlington, ON':{latitude:43.3255,longitude:-79.7990},'Hamilton, ON':{latitude:43.2557,longitude:-79.8711},'Niagara-on-the-Lake, ON':{latitude:43.2549,longitude:-79.0773},'Niagara Falls, ON':{latitude:43.0896,longitude:-79.0849},
  'New York, NY':{latitude:40.7128,longitude:-74.0060},'Los Angeles, CA':{latitude:34.0522,longitude:-118.2437},'Chicago, IL':{latitude:41.8781,longitude:-87.6298},'Houston, TX':{latitude:29.7604,longitude:-95.3698},'Dallas, TX':{latitude:32.7767,longitude:-96.7970},'Austin, TX':{latitude:30.2672,longitude:-97.7431},'San Francisco, CA':{latitude:37.7749,longitude:-122.4194},'Seattle, WA':{latitude:47.6062,longitude:-122.3321},'Miami, FL':{latitude:25.7617,longitude:-80.1918},'Boston, MA':{latitude:42.3601,longitude:-71.0589},'Washington, DC':{latitude:38.9072,longitude:-77.0369},'San Diego, CA':{latitude:32.7157,longitude:-117.1611},'Atlanta, GA':{latitude:33.7490,longitude:-84.3880},'Denver, CO':{latitude:39.7392,longitude:-104.9903},'Las Vegas, NV':{latitude:36.1699,longitude:-115.1398},'Orlando, FL':{latitude:28.5383,longitude:-81.3792},'Portland, OR':{latitude:45.5152,longitude:-122.6784},'Phoenix, AZ':{latitude:33.4484,longitude:-112.0740},'Tampa, FL':{latitude:27.9506,longitude:-82.4572},'Charlotte, NC':{latitude:35.2271,longitude:-80.8431},'Philadelphia, PA':{latitude:39.9526,longitude:-75.1652},'Minneapolis, MN':{latitude:44.9778,longitude:-93.2650},'Nashville, TN':{latitude:36.1627,longitude:-86.7816},'Salt Lake City, UT':{latitude:40.7608,longitude:-111.8910},'Kansas City, MO':{latitude:39.0997,longitude:-94.5786},'Raleigh, NC':{latitude:35.7796,longitude:-78.6382},'Columbus, OH':{latitude:39.9612,longitude:-82.9988},'Detroit, MI':{latitude:42.3314,longitude:-83.0458},
  'Vancouver, BC':{latitude:49.2827,longitude:-123.1207},'Montreal, QC':{latitude:45.5019,longitude:-73.5674},'Calgary, AB':{latitude:51.0447,longitude:-114.0719},'Ottawa, ON':{latitude:45.4215,longitude:-75.6972},'Edmonton, AB':{latitude:53.5461,longitude:-113.4938},'Quebec City, QC':{latitude:46.8139,longitude:-71.2080},'Winnipeg, MB':{latitude:49.8951,longitude:-97.1384},'Halifax, NS':{latitude:44.6488,longitude:-63.5752},'Victoria, BC':{latitude:48.4284,longitude:-123.3656},'Saskatoon, SK':{latitude:52.1332,longitude:-106.6700},'Regina, SK':{latitude:50.4452,longitude:-104.6189},
};
const citySuggestions=Object.keys(cityCoordinates);
const datePackages:DatePackage[]=[
  {id:'safe-cafe',title:'First Date Safe Café',tier:'Starter',city:'Any major city',price:'$18–$35 pp',duration:'60–75 min',icon:'cafe',includes:['Quiet public café shortlist','Two time options','Safety check-in reminder'],safety:'Public, easy exit, no private address shared.'},
  {id:'chai-dessert',title:'Chai + Dessert Walk',tier:'Community favorite',city:'NYC · Toronto · Dallas',price:'$22–$45 pp',duration:'90 min',icon:'ice-cream',includes:['Indian dessert spot','Nearby public walk','Conversation prompts'],safety:'Busy area, daytime/evening public route.'},
  {id:'museum-coffee',title:'Museum + Coffee',tier:'Values date',city:'USA / Canada',price:'$25–$55 pp',duration:'2 hours',icon:'color-palette',includes:['Museum or gallery pick','Coffee after','Low-pressure activity'],safety:'Staffed indoor venue with public seating.'},
  {id:'indian-dinner',title:'Indian Dinner Date',tier:'Plus',city:'Top metro cities',price:'$45–$90 pp',duration:'90–120 min',icon:'restaurant',includes:['Vegetarian-friendly restaurant','Reservation hold preview','Split/host payment choice'],safety:'Partner venue, reservation trail and check-in.'},
  {id:'rooftop-table',title:'Premium Rooftop Table',tier:'Premium',city:'NYC · LA · Miami · Toronto',price:'$95–$180 pp',duration:'2 hours',icon:'wine',includes:['Rooftop or lounge table','Mocktail/dessert option','Concierge reminder'],safety:'Staffed venue, separate arrivals encouraged.'},
  {id:'executive-dinner',title:'Executive Invite-only Dinner',tier:'Executive Circle',city:'NYC · SF · Dallas',price:'Included after approval',duration:'2.5 hours',icon:'diamond',includes:['Verified guest list','Hosted table','Private concierge follow-up'],safety:'Invite-only, ID/business verified, host present.'},
];
const coupleBundles:CoupleBundle[]=[
  {id:'easy-first-date',title:'The Easy First Date',city:'Any USA / Canada city',price:'From $69',priceCents:6900,duration:'2–3 hours',mood:'Cozy',icon:'cafe',includes:['Café or dessert reservation','Shared-interest activity','Parking/transit guidance','Safety check-in'],flexibility:'Free plan changes before venue confirmation.',safety:'Public venues, separate arrival options and private contact details.'},
  {id:'date-night',title:'Dinner + Something Fun',city:'Any USA / Canada city',price:'From $189',priceCents:18900,duration:'4–5 hours',mood:'Playful',icon:'restaurant',includes:['Dinner table for two','Comedy, games or live show','Dessert stop','One shared itinerary'],flexibility:'Flexible time swap when inventory allows.',safety:'Verified reservation trail and optional trusted-contact share.'},
  {id:'city-escape',title:'Romantic City Escape',city:'Any USA / Canada city',price:'From $649',priceCents:64900,duration:'1 night',mood:'Romantic',icon:'bed',includes:['Boutique hotel stay','Dinner reservation','Couples experience','Breakfast or late checkout'],flexibility:'Refund and cancellation terms shown before confirmation.',safety:'Hotel and venue details unlock only after both partners accept.'},
  {id:'weekend',title:'Anniversary Weekend',city:'Any USA / Canada city',price:'From $1,249',priceCents:124900,duration:'2 nights',mood:'Luxury',icon:'diamond',includes:['Premium romantic hotel','Chef-led dinner','Spa or wellness session','Flowers and private concierge'],flexibility:'Concierge handles changes across the complete itinerary.',safety:'One support contact for stay, dining, experience and transport issues.'},
];
const marketplaceBookingTypes=[
  {title:'Restaurants & cafés',body:'Real-time tables, dietary preferences, deposits and cancellation terms.',icon:'restaurant' as const,tone:'ruby' as PremiumIconTone},
  {title:'Hotels & romantic stays',body:'Room availability, total price, amenities, policies and secure booking.',icon:'bed' as const,tone:'gold' as PremiumIconTone},
  {title:'Experiences & tours',body:'Cooking, pottery, comedy, museums, cruises and local activities.',icon:'ticket' as const,tone:'plum' as PremiumIconTone},
  {title:'Events & entertainment',body:'Concerts, sports, theatre, festivals and DestinyOne hosted mixers.',icon:'musical-notes' as const,tone:'rose' as PremiumIconTone},
  {title:'Spa & wellness',body:'Couples massage, wellness day, yoga and relaxing retreat options.',icon:'flower' as const,tone:'gold' as PremiumIconTone},
  {title:'Surprises & gifting',body:'Flowers, dessert, room décor and meaningful add-ons in one order.',icon:'gift' as const,tone:'ruby' as PremiumIconTone},
  {title:'Transport & arrival',body:'Parking, transit, separate arrival plans and future ride integrations.',icon:'car' as const,tone:'dark' as PremiumIconTone},
] as const;
const partnerPipeline=[
  ['Venue database','Curated USA/Canada places with safe-first-date notes, category filters and city search.',true],
  ['Partner outreach','Restaurant/café partner program with package menu, refund SLA and support contact.',true],
  ['Reservation API','Provider adapter planned for table holds, quote expiry, confirmation and cancellation webhooks.',true],
  ['Date safety ops','Check-ins, trusted-contact share, public venue rules and report path are part of each date flow.',true],
  ['Event operations','Capacity, ticketing, host check-in and verified-member list are ready for live provider connection.',false],
] as const;
const launchCityRoadmap=[
  {city:'New York / New Jersey',stage:'Launch city',focus:'Indian cafés, rooftop dinners, Gujarati/Punjabi mixers',event:'Rooftop Chai Mixer',icon:'business' as const},
  {city:'Toronto',stage:'Launch city',focus:'Punjabi culture nights, dessert walks, professional mixers',event:'Punjabi Culture Night',icon:'leaf' as const},
  {city:'Dallas',stage:'Fast follow',focus:'Marriage-minded speed dating, Indian dinner packages',event:'Marriage-minded Speed Dating',icon:'flame' as const},
  {city:'Bay Area',stage:'Fast follow',focus:'South Asian professionals, museum + coffee dates',event:'Professionals Mixer',icon:'sparkles' as const},
  {city:'Los Angeles',stage:'Premium city',focus:'Invite-only dinners, rooftop tables, executive introductions',event:'Premium Dinner',icon:'diamond' as const},
] as const;
const reservationOps=[
  {title:'Quote + hold',body:'Show package price, hold expiry, refund rules and venue confirmation before payment.',icon:'receipt-outline' as const},
  {title:'Private acceptance',body:'Both members confirm the date plan before location details or reservation actions are finalized.',icon:'lock-closed-outline' as const},
  {title:'Safety check-in',body:'Reminder before and after the date with quick “I’m safe” and support/report paths.',icon:'shield-checkmark-outline' as const},
  {title:'Partner support',body:'Venue cancellation, late arrival, refund and support escalation are tracked as provider events.',icon:'headset-outline' as const},
] as const;
const safeDateChecklist=[
  'Public venue with staff nearby',
  'Separate arrival and exit options',
  'No home address sharing',
  'Check-in reminder enabled',
  'Report/block path one tap away',
] as const;
const placeDirectory:PlaceItem[]=[
  {id:'nyc-bow-bridge',name:'Central Park Bow Bridge',city:'New York, NY',country:'USA',kind:'Park',area:'Central Park',price:'Free',vibe:'Classic walk, photos and quiet conversation',bestTime:'Saturday morning',safety:'Very public in daytime; meet near main paths',icon:'🌳',tags:['walk','tourist','romantic']},
  {id:'nyc-bryant',name:'Bryant Park Coffee Walk',city:'New York, NY',country:'USA',kind:'Cafe',area:'Midtown',price:'$',vibe:'Easy first coffee with public seating',bestTime:'Weekday evening',safety:'Busy public area near transit',icon:'☕',tags:['coffee','public','quick']},
  {id:'nyc-pier57',name:'Pier 57 Rooftop & Food Hall',city:'New York, NY',country:'USA',kind:'Restaurant',area:'Chelsea / Hudson River',price:'$$',vibe:'Views, food choices and low-pressure seating',bestTime:'Sunset',safety:'Public venue with multiple exits',icon:'🌇',tags:['food hall','views','sunset']},
  {id:'nyc-met',name:'The Met Museum Date',city:'New York, NY',country:'USA',kind:'Cultural',area:'Upper East Side',price:'$$',vibe:'Art, values and easy conversation starters',bestTime:'Sunday afternoon',safety:'Indoor public museum',icon:'🖼️',tags:['museum','culture','day date']},
  {id:'la-griffith',name:'Griffith Observatory',city:'Los Angeles, CA',country:'USA',kind:'Tourist',area:'Los Feliz',price:'Free',vibe:'City views, stars and meaningful talk',bestTime:'Golden hour',safety:'Public attraction; parking can be busy',icon:'🔭',tags:['views','tourist','sunset']},
  {id:'la-getty',name:'Getty Center Garden Walk',city:'Los Angeles, CA',country:'USA',kind:'Cultural',area:'Brentwood',price:'$',vibe:'Architecture, gardens and slow conversation',bestTime:'Saturday afternoon',safety:'Staffed public campus',icon:'🏛️',tags:['museum','garden','art']},
  {id:'la-venice',name:'Venice Canals Stroll',city:'Los Angeles, CA',country:'USA',kind:'Park',area:'Venice',price:'Free',vibe:'Scenic walk without loud bar energy',bestTime:'Morning',safety:'Meet in daylight and stay on public walkways',icon:'🌊',tags:['walk','photo','calm']},
  {id:'la-rooftop',name:'Downtown Rooftop Mocktail Lounge',city:'Los Angeles, CA',country:'USA',kind:'Lounge',area:'DTLA',price:'$$$',vibe:'Premium evening date with skyline energy',bestTime:'Friday 8 PM',safety:'Choose staffed venues and arrange own transport',icon:'🍸',tags:['rooftop','premium','mocktails']},
  {id:'chi-riverwalk',name:'Chicago Riverwalk',city:'Chicago, IL',country:'USA',kind:'Tourist',area:'Downtown',price:'Free',vibe:'Beautiful walk, architecture and easy stops',bestTime:'Summer evening',safety:'Public and active; avoid isolated late hours',icon:'🚶',tags:['walk','architecture','views']},
  {id:'chi-millennium',name:'Millennium Park + Dessert',city:'Chicago, IL',country:'USA',kind:'Dessert',area:'The Loop',price:'$',vibe:'Tourist classic plus sweet treat after',bestTime:'Afternoon',safety:'Meet near main entrances',icon:'🍨',tags:['dessert','tourist','public']},
  {id:'chi-westloop',name:'West Loop Dinner Row',city:'Chicago, IL',country:'USA',kind:'Restaurant',area:'West Loop',price:'$$$',vibe:'Upscale dinner options for second dates',bestTime:'Saturday dinner',safety:'Use reservation and share date plan',icon:'🍽️',tags:['dinner','premium','restaurant']},
  {id:'hou-buffalo',name:'Buffalo Bayou Park',city:'Houston, TX',country:'USA',kind:'Park',area:'Montrose / Downtown',price:'Free',vibe:'Walk, skyline and casual outdoor energy',bestTime:'Morning or sunset',safety:'Daytime recommended for first date',icon:'🌿',tags:['walk','park','skyline']},
  {id:'hou-museum',name:'Museum District Café Date',city:'Houston, TX',country:'USA',kind:'Cafe',area:'Museum District',price:'$$',vibe:'Coffee before or after a museum visit',bestTime:'Sunday afternoon',safety:'Public, easy to exit politely',icon:'☕',tags:['museum','coffee','culture']},
  {id:'dal-klyde',name:'Klyde Warren Park',city:'Dallas, TX',country:'USA',kind:'Park',area:'Arts District',price:'Free',vibe:'Food trucks, public seating and light activity',bestTime:'Saturday lunch',safety:'Busy public park',icon:'🌮',tags:['food trucks','park','casual']},
  {id:'dal-bishop',name:'Bishop Arts Dessert Walk',city:'Dallas, TX',country:'USA',kind:'Dessert',area:'Bishop Arts',price:'$$',vibe:'Cute shops, dessert and low-pressure wandering',bestTime:'Evening',safety:'Stay in active streets',icon:'🧁',tags:['dessert','shops','walk']},
  {id:'aus-ladybird',name:'Lady Bird Lake Trail',city:'Austin, TX',country:'USA',kind:'Park',area:'Downtown Austin',price:'Free',vibe:'Active, relaxed and conversation-friendly',bestTime:'Morning',safety:'Public trail; daytime first',icon:'🏞️',tags:['walk','fitness','outdoor']},
  {id:'aus-southcongress',name:'South Congress Coffee + Shops',city:'Austin, TX',country:'USA',kind:'Cafe',area:'SoCo',price:'$$',vibe:'Coffee, boutiques and playful photos',bestTime:'Saturday afternoon',safety:'Busy public area',icon:'🛍️',tags:['coffee','shops','casual']},
  {id:'sf-ferry',name:'Ferry Building Date',city:'San Francisco, CA',country:'USA',kind:'Restaurant',area:'Embarcadero',price:'$$',vibe:'Food stalls, bay views and easy stroll',bestTime:'Weekend lunch',safety:'Public indoor/outdoor marketplace',icon:'🌁',tags:['food hall','bay','walk']},
  {id:'sf-golden',name:'Golden Gate Park Tea Garden',city:'San Francisco, CA',country:'USA',kind:'Cultural',area:'Golden Gate Park',price:'$$',vibe:'Quiet, beautiful and intentional',bestTime:'Sunday afternoon',safety:'Daytime public attraction',icon:'🍵',tags:['tea','garden','culture']},
  {id:'sea-pike',name:'Pike Place Market',city:'Seattle, WA',country:'USA',kind:'Tourist',area:'Downtown Seattle',price:'$$',vibe:'Food, flowers and playful exploration',bestTime:'Morning',safety:'Busy public market',icon:'💐',tags:['market','flowers','tourist']},
  {id:'sea-kerry',name:'Kerry Park Viewpoint',city:'Seattle, WA',country:'USA',kind:'Tourist',area:'Queen Anne',price:'Free',vibe:'Short scenic stop, best paired with coffee',bestTime:'Sunset',safety:'Public viewpoint; keep it brief for first meet',icon:'🌄',tags:['views','photo','sunset']},
  {id:'mia-wynwood',name:'Wynwood Walls + Café',city:'Miami, FL',country:'USA',kind:'Cultural',area:'Wynwood',price:'$$',vibe:'Art, color and easy conversation',bestTime:'Afternoon',safety:'Stay in main public art areas',icon:'🎨',tags:['art','coffee','walk']},
  {id:'mia-brickell',name:'Brickell Dinner Lounge',city:'Miami, FL',country:'USA',kind:'Lounge',area:'Brickell',price:'$$$',vibe:'Dressy evening with city energy',bestTime:'Friday evening',safety:'Meet inside venue, arrange own ride',icon:'✨',tags:['lounge','premium','dinner']},
  {id:'bos-seaport',name:'Boston Seaport Walk',city:'Boston, MA',country:'USA',kind:'Park',area:'Seaport',price:'Free',vibe:'Waterfront, clean public space and cafés nearby',bestTime:'Late afternoon',safety:'Public and active area',icon:'🌊',tags:['waterfront','walk','coffee']},
  {id:'bos-isabella',name:'Isabella Stewart Gardner Museum',city:'Boston, MA',country:'USA',kind:'Cultural',area:'Fenway',price:'$$',vibe:'Romantic art setting without bar pressure',bestTime:'Sunday afternoon',safety:'Staffed indoor museum',icon:'🏺',tags:['museum','art','romantic']},
  {id:'dc-mall',name:'National Mall Walk',city:'Washington, DC',country:'USA',kind:'Tourist',area:'National Mall',price:'Free',vibe:'Iconic monuments and meaningful talks',bestTime:'Morning',safety:'Public; avoid isolated late-night walks',icon:'🏛️',tags:['tourist','walk','history']},
  {id:'dc-georgetown',name:'Georgetown Waterfront Dessert',city:'Washington, DC',country:'USA',kind:'Dessert',area:'Georgetown',price:'$$',vibe:'River views, dessert and cute streets',bestTime:'Evening',safety:'Busy public area',icon:'🍰',tags:['dessert','waterfront','walk']},
  {id:'sd-balboa',name:'Balboa Park Garden Date',city:'San Diego, CA',country:'USA',kind:'Park',area:'Balboa Park',price:'Free',vibe:'Gardens, museums and sunshine',bestTime:'Saturday afternoon',safety:'Public daytime location',icon:'🌺',tags:['garden','museum','outdoor']},
  {id:'atl-beltline',name:'Atlanta BeltLine + Food Hall',city:'Atlanta, GA',country:'USA',kind:'Activity',area:'Old Fourth Ward',price:'$$',vibe:'Walk, murals and food options',bestTime:'Weekend afternoon',safety:'Stay on active trail sections',icon:'🚲',tags:['walk','food hall','murals']},
  {id:'den-union',name:'Denver Union Station Coffee',city:'Denver, CO',country:'USA',kind:'Cafe',area:'LoDo',price:'$$',vibe:'Cozy public coffee date with transit access',bestTime:'Sunday morning',safety:'Public landmark with staff nearby',icon:'🚉',tags:['coffee','public','cozy']},
  {id:'lv-bellagio',name:'Bellagio Conservatory Walk',city:'Las Vegas, NV',country:'USA',kind:'Tourist',area:'The Strip',price:'Free',vibe:'Beautiful indoor walk without casino pressure',bestTime:'Afternoon',safety:'Busy public resort area',icon:'🌸',tags:['tourist','indoor','photo']},
  {id:'orl-disney',name:'Disney Springs Dinner Walk',city:'Orlando, FL',country:'USA',kind:'Restaurant',area:'Lake Buena Vista',price:'$$',vibe:'Food, music and safe public energy',bestTime:'Evening',safety:'Highly public, staffed area',icon:'🎶',tags:['restaurant','walk','entertainment']},
  {id:'tor-distillery',name:'Distillery District Date',city:'Toronto, ON',country:'Canada',kind:'Cultural',area:'Downtown Toronto',price:'$$',vibe:'Historic streets, dessert and galleries',bestTime:'Saturday afternoon',safety:'Public pedestrian district',icon:'🧱',tags:['culture','dessert','walk']},
  {id:'tor-cn',name:'CN Tower Views + Dinner Nearby',city:'Toronto, ON',country:'Canada',kind:'Tourist',area:'Entertainment District',price:'$$$',vibe:'Big-city premium date energy',bestTime:'Sunset',safety:'Public landmark; book ahead',icon:'🗼',tags:['views','tourist','premium']},
  {id:'tor-yorkville',name:'Yorkville Café & Gallery Walk',city:'Toronto, ON',country:'Canada',kind:'Cafe',area:'Yorkville',price:'$$',vibe:'Polished café date and calm streets',bestTime:'Sunday afternoon',safety:'Busy upscale neighborhood',icon:'☕',tags:['coffee','gallery','premium']},
  {id:'van-stanley',name:'Stanley Park Seawall',city:'Vancouver, BC',country:'Canada',kind:'Park',area:'Stanley Park',price:'Free',vibe:'Iconic walk with ocean views',bestTime:'Morning',safety:'Daytime public route recommended',icon:'🌲',tags:['walk','views','outdoor']},
  {id:'van-granville',name:'Granville Island Market',city:'Vancouver, BC',country:'Canada',kind:'Restaurant',area:'Granville Island',price:'$$',vibe:'Food market, shops and waterfront',bestTime:'Lunch',safety:'Public market',icon:'🛶',tags:['market','food','waterfront']},
  {id:'mtl-old',name:'Old Montréal Evening Walk',city:'Montreal, QC',country:'Canada',kind:'Tourist',area:'Old Montréal',price:'Free',vibe:'Cobblestones, lights and romantic streets',bestTime:'Early evening',safety:'Stay in active tourist streets',icon:'🏙️',tags:['tourist','romantic','walk']},
  {id:'mtl-mountroyal',name:'Mount Royal Lookout',city:'Montreal, QC',country:'Canada',kind:'Park',area:'Mount Royal',price:'Free',vibe:'Views and outdoor conversation',bestTime:'Daytime',safety:'Daylight first-date option',icon:'⛰️',tags:['views','park','outdoor']},
  {id:'cal-peace',name:'Peace Bridge + River Café Area',city:'Calgary, AB',country:'Canada',kind:'Cafe',area:'Bow River',price:'$$',vibe:'Walk plus coffee/dessert nearby',bestTime:'Afternoon',safety:'Public river path',icon:'🌉',tags:['walk','coffee','river']},
  {id:'cal-prince',name:"Prince's Island Park",city:'Calgary, AB',country:'Canada',kind:'Park',area:'Downtown Calgary',price:'Free',vibe:'Relaxed green-space date',bestTime:'Morning',safety:'Public park in daylight',icon:'🍃',tags:['park','walk','calm']},
  {id:'ott-byward',name:'ByWard Market Food Walk',city:'Ottawa, ON',country:'Canada',kind:'Restaurant',area:'ByWard Market',price:'$$',vibe:'Food stalls, desserts and lively streets',bestTime:'Weekend afternoon',safety:'Busy public market',icon:'🥐',tags:['market','food','dessert']},
  {id:'ott-canal',name:'Rideau Canal Walk',city:'Ottawa, ON',country:'Canada',kind:'Tourist',area:'Downtown Ottawa',price:'Free',vibe:'Scenic walk with historic city feel',bestTime:'Afternoon',safety:'Public path; daytime recommended',icon:'⛸️',tags:['walk','tourist','views']},
  {id:'tor-romantic-dinner',name:'Toronto Skyline Dinner for Two',city:'Toronto, ON',country:'Canada',kind:'Restaurant',area:'Financial District',price:'$$$',vibe:'Window-table dining with skyline views and a polished evening atmosphere',bestTime:'Friday · 7:30 PM',safety:'Staffed downtown venue near transit',icon:'🍽️',tags:['romantic','dinner','views','reservable'],photo:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=82'},
  {id:'tor-boutique-stay',name:'Boutique Romance Stay',city:'Toronto, ON',country:'Canada',kind:'Hotel',area:'Queen Street East',price:'$$$$',vibe:'Design-led suite, breakfast and spa add-on for a one-night city escape',bestTime:'Weekend check-in',safety:'Verified hotel desk and private itinerary details',icon:'🛏️',tags:['hotel','romantic','spa','breakfast'],photo:'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=82'},
  {id:'tor-spa-day',name:'Couples Spa + Afternoon Tea',city:'Toronto, ON',country:'Canada',kind:'Wellness',area:'Yorkville',price:'$$$',vibe:'Relaxing couples treatment followed by tea in a calm upscale setting',bestTime:'Saturday · 2 PM',safety:'Licensed staffed wellness venue',icon:'🌸',tags:['spa','wellness','tea','couples'],photo:'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=82'},
  {id:'mis-lakefront',name:'Port Credit Lakefront Date',city:'Mississauga, ON',country:'Canada',kind:'Cafe',area:'Port Credit',price:'$$',vibe:'Coffee, waterfront walk and sunset with easy GO Transit access',bestTime:'Sunday · 4 PM',safety:'Busy public waterfront and main-street cafés',icon:'☕',tags:['coffee','waterfront','sunset','public'],photo:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=82'},
  {id:'oak-harbour',name:'Oakville Harbour Dinner Walk',city:'Oakville, ON',country:'Canada',kind:'Restaurant',area:'Old Oakville',price:'$$$',vibe:'Intimate dinner followed by a quiet harbour walk',bestTime:'Saturday · 6 PM',safety:'Active downtown streets and staffed restaurant',icon:'🌊',tags:['dinner','harbour','romantic','walk'],photo:'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=82'},
  {id:'ham-art-date',name:'Hamilton Art + Dessert Date',city:'Hamilton, ON',country:'Canada',kind:'Cultural',area:'James Street North',price:'$$',vibe:'Gallery browsing, local dessert and creative conversation starters',bestTime:'Friday · 6 PM',safety:'Public arts district with staffed venues',icon:'🎨',tags:['gallery','dessert','art','shared interest'],photo:'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1200&q=82'},
  {id:'notl-winery',name:'Niagara Winery + Chef Lunch',city:'Niagara-on-the-Lake, ON',country:'Canada',kind:'Activity',area:'Wine Country',price:'$$$$',vibe:'Scenic tasting, chef lunch and countryside views for a special occasion',bestTime:'Saturday · 12 PM',safety:'Ticketed staffed experience; arrange a sober driver',icon:'🍇',tags:['winery','lunch','romantic','experience'],photo:'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=82'},
  {id:'niagara-falls-stay',name:'Falls-view Romantic Escape',city:'Niagara Falls, ON',country:'Canada',kind:'Hotel',area:'Fallsview',price:'$$$$',vibe:'One-night stay, falls-view room and dinner package',bestTime:'Friday check-in',safety:'Verified hotel with staffed lobby and secure booking trail',icon:'🏨',tags:['hotel','falls','weekend','romantic'],photo:'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=82'},
  {id:'markham-dinner',name:'Markham Asian Night Market Date',city:'Markham, ON',country:'Canada',kind:'Restaurant',area:'Downtown Markham',price:'$$',vibe:'Shareable food, dessert and lively low-pressure energy',bestTime:'Saturday evening',safety:'Public plaza with multiple staffed venues',icon:'🥟',tags:['food','dessert','casual','public'],photo:'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=82'},
  {id:'vaughan-fun',name:'Vaughan Games + Dinner Night',city:'Vaughan, ON',country:'Canada',kind:'Activity',area:'Vaughan Metropolitan Centre',price:'$$$',vibe:'Playful games, easy conversation and dinner nearby',bestTime:'Friday · 7 PM',safety:'Indoor staffed entertainment venue near transit',icon:'🎳',tags:['games','dinner','playful','indoor'],photo:'https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=82'},
];

const placeSearchText=(place:PlaceItem)=>[place.name,place.city,place.country,place.kind,place.area,place.vibe,place.safety,place.tags.join(' ')].join(' ').toLowerCase();
const isSafeFirstDatePlace=(place:PlaceItem)=>/public|staffed|busy|daytime|museum|market|transit|active|indoor|partner|main/.test(placeSearchText(place));
const isReservablePlace=(place:PlaceItem)=>['Restaurant','Cafe','Hotel','Wellness','Lounge','Cultural','Dessert','Activity'].includes(place.kind);
const isPremiumPlace=(place:PlaceItem)=>place.price.includes('$$$')||/premium|upscale|rooftop|dinner|views|lounge|yorkville|tower/.test(placeSearchText(place));
const isCommunityPlace=(place:PlaceItem)=>/indian|chai|spice|culture|dessert|vegetarian|food|market|tea/.test(placeSearchText(place));
const fallbackPlacePhotos:Record<PlaceKind,string>={Restaurant:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',Cafe:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',Hotel:'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',Wellness:'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',Tourist:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',Activity:'https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=80',Park:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',Dessert:'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=80',Lounge:'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',Cultural:'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1200&q=80'};
const placePhoto=(place:PlaceItem)=>place.photo??fallbackPlacePhotos[place.kind];
const distanceMiles=(from:{latitude:number;longitude:number},to:{latitude:number;longitude:number})=>{
  const radians=(value:number)=>value*Math.PI/180;
  const latitudeDelta=radians(to.latitude-from.latitude);
  const longitudeDelta=radians(to.longitude-from.longitude);
  const a=Math.sin(latitudeDelta/2)**2+Math.cos(radians(from.latitude))*Math.cos(radians(to.latitude))*Math.sin(longitudeDelta/2)**2;
  return 3958.8*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};
const buildMarketplaceSnapshot=()=>buildDateMarketplaceSnapshot({
  venueCount:placeDirectory.length,
  cityCount:placeCities.filter(city=>city!=='All').length,
  packageCount:datePackages.length,
  eventCount:eventExperiences.length,
  hasSearch:true,
  hasSafeFirstDateFilter:true,
  hasPartnerProgram:true,
  hasReservationApiPlan:true,
  hasSafetyCheckIns:true,
  hasIndianMixers:eventExperiences.some(event=>/indian|south asian|punjabi|gujarati|chai|culture/i.test(`${event.title} ${event.body}`)),
  hasSpeedVideoEvents:eventExperiences.some(event=>/speed|video/i.test(`${event.title} ${event.body} ${event.type}`)),
  hasPremiumDinners:eventExperiences.some(event=>/premium|invite|dinner|executive/i.test(`${event.title} ${event.body} ${event.type}`)),
});
const launchMarketplaceCoverage=[
  {city:'NYC/NJ',partnerLeads:8,signedPartners:1,eventHosts:1,monthlyEvents:2,capacitySeats:80},
  {city:'Bay Area',partnerLeads:6,signedPartners:1,eventHosts:1,monthlyEvents:1,capacitySeats:48},
  {city:'Dallas',partnerLeads:5,signedPartners:1,eventHosts:1,monthlyEvents:1,capacitySeats:42},
  {city:'Toronto',partnerLeads:7,signedPartners:1,eventHosts:1,monthlyEvents:2,capacitySeats:90},
  {city:'Chicago',partnerLeads:4,signedPartners:1,eventHosts:1,monthlyEvents:1,capacitySeats:32},
] as const;
const buildLiveMarketplaceOpsSnapshot=()=>buildMarketplaceOpsSnapshot({
  venueCount:placeDirectory.length,
  curatedCityCount:placeCities.filter(city=>city!=='All').length,
  datePackageCount:datePackages.length,
  partnerLeadCount:launchMarketplaceCoverage.reduce((sum,city)=>sum+city.partnerLeads,0),
  signedPartnerCount:launchMarketplaceCoverage.reduce((sum,city)=>sum+city.signedPartners,0),
  livePlacesProviderConnected:false,
  reservationProviderConnected:false,
  bookingLifecycleReady:true,
  inventoryFreshnessReady:true,
  paymentWebhookConnected:paymentsConfigured,
  webhookReconciliationReady:false,
  refundPolicyReady:false,
  supportSlaHours:48,
  safetyStaffingReady:false,
  eventHostCount:launchMarketplaceCoverage.reduce((sum,city)=>sum+city.eventHosts,0),
  eventConceptCount:eventExperiences.length,
  cityCoverage:launchMarketplaceCoverage,
  partnerComplianceReady:true,
  atomicInventoryHoldReady:true,
  serverRefundCaseReady:true,
  reconciliationCaseReady:true,
});

function RelationshipCoach({match,preferences,onBack,onOpenFilters,onUseInChat,onSubmitFeedback}:{match:Match;preferences:{intent:string;vibes:string[];filters:MatchFilters};onBack:()=>void;onOpenFilters:()=>void;onUseInChat:(draft:string)=>void;onSubmitFeedback:(feedback:'promising'|'not_aligned'|'met_in_person',useForMatching:boolean)=>Promise<boolean>}){
  const [selected,setSelected]=useState('First-message helper');
  const [topic,setTopic]=useState('family, emotional safety, and first-date clarity');
  const [saved,setSaved]=useState(false);
  const [useFeedbackForMatching,setUseFeedbackForMatching]=useState(false);
  const [feedbackSaved,setFeedbackSaved]=useState('');
  const reasons=match.reasons??matchReasons(match,preferences);
  const redFlags=['Asks to move off-app too fast','Pushes for exact location','Requests money, crypto or gift cards','Avoids verification or public places'];
  const output=selected==='First-message helper'
    ? `Hey ${match.name}, I liked that your profile feels ${match.familyPriority==='high'?'family-rooted':'intentional'}. I’m curious — what does a peaceful weekend usually look like for you?`
    : selected==='Profile polish'
      ? `I’m here for something real: a warm, steady relationship built on ${topic}. I value clear communication, family respect, and a life that still leaves room for joy.`
      : selected==='Post-date reflection'
        ? `After a date, ask yourself: Did I feel respected? Was intent clear? Did conversation feel calm or performative? Would I feel safe meeting again in public?`
        : `Safety scan for ${match.name}: keep early chat in-app, meet in public, avoid exact live location, and report any pressure around money, secrecy or fast off-app moves.`;
  const saveNote=()=>setSaved(true);
  const submitFeedback=async(feedback:'promising'|'not_aligned'|'met_in_person',label:string)=>{
    const confirmed=await onSubmitFeedback(feedback,useFeedbackForMatching);
    if(confirmed)setFeedbackSaved(label);
  };
  return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}><SafeAreaView style={shared.safe}><View style={coachStyles.header}><Pressable onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable><Text style={[styles.cardTitle,{marginLeft:12}]}>AI Relationship Coach</Text></View><ScrollView contentContainerStyle={coachStyles.content} showsVerticalScrollIndicator={false}>
    <View style={coachStyles.hero}><PremiumIcon name="sparkles" tone="ruby" size={70} iconSize={32}/><Text style={launchStyles.scriptHero}>Helpful, never fake</Text><Text style={[shared.h1,{textAlign:'center'}]}>Make dating feel clearer.</Text><Text style={[shared.body,{textAlign:'center'}]}>Coach uses only DestinyOne profile inputs, filters and in-app signals. It helps you show up better — it does not pretend to be you.</Text></View>
    <View style={coachStyles.cardGrid}>{coachCards.map((card,index)=><Pressable key={card.title} onPress={()=>{setSelected(card.title);setSaved(false)}} style={[coachStyles.toolCard,selected===card.title&&coachStyles.toolCardOn]}><PremiumIcon name={card.icon} tone={selected===card.title?'gold':index%2?'plum':'ruby'} size={48} iconSize={22}/><Text style={coachStyles.toolTitle}>{card.title}</Text><Text style={coachStyles.toolBody}>{card.body}</Text></Pressable>)}</View>
    <View style={coachStyles.outputCard}><Text style={styles.kicker}>WHAT SHOULD COACH FOCUS ON?</Text><TextInput value={topic} onChangeText={setTopic} placeholder="Example: family, faith, first-date clarity" placeholderTextColor="#6F6875" style={coachStyles.coachInput}/><Text style={styles.kicker}>COACH OUTPUT</Text><Text style={styles.cardTitle}>{selected}</Text>{selected==='Red-flag scan'?<View style={{gap:9}}>{redFlags.map(item=><View key={item} style={coachStyles.checkRow}><PremiumIcon name="shield-checkmark-outline" tone="gold" size={30} iconSize={14}/><Text style={coachStyles.checkText}>{item}</Text></View>)}</View>:<Text style={coachStyles.outputText}>“{output}”</Text>}{selected==='Post-date reflection'&&<View style={coachStyles.feedbackCard}><Text style={styles.cardTitle}>How did this connection feel?</Text><Text style={styles.helper}>Private outcome feedback is more useful than swipe behavior. It is never shown to {match.name}.</Text><View style={coachStyles.feedbackChoices}>{([{id:'promising',label:'Promising',icon:'heart-outline'},{id:'not_aligned',label:'Not aligned',icon:'remove-circle-outline'},{id:'met_in_person',label:'Met in person',icon:'people-outline'}] as const).map(item=><Pressable key={item.id} onPress={()=>void submitFeedback(item.id,item.label)} style={coachStyles.feedbackChoice}><Ionicons name={item.icon} size={17} color={colors.gold}/><Text style={coachStyles.feedbackChoiceText}>{item.label}</Text></Pressable>)}</View><Pressable accessibilityRole="checkbox" accessibilityState={{checked:useFeedbackForMatching}} onPress={()=>setUseFeedbackForMatching(value=>!value)} style={coachStyles.feedbackConsent}><Ionicons name={useFeedbackForMatching?'checkbox':'square-outline'} size={21} color={useFeedbackForMatching?colors.gold:colors.muted}/><Text style={coachStyles.feedbackConsentText}>Use this outcome to improve my future introductions</Text></Pressable>{!!feedbackSaved&&<Text style={coachStyles.feedbackSaved}>{feedbackSaved} saved privately</Text>}</View>}<View style={coachStyles.coachActions}><Pressable onPress={saveNote} style={[coachStyles.rsvpButton,{flex:1}]}><Text style={coachStyles.rsvpText}>{saved?'Saved':'Save note'}</Text></Pressable><Pressable onPress={()=>onUseInChat(output)} style={[coachStyles.rsvpButton,{flex:1,backgroundColor:'#7A1024'}]}><Text style={coachStyles.rsvpText}>Use in chat</Text></Pressable></View>{saved&&<View style={coachStyles.savedNote}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={28} iconSize={13}/><Text style={coachStyles.savedNoteText}>Coach note saved for this preview session. Production will store private notes securely.</Text></View>}</View>
    <View style={coachStyles.outputCard}><Text style={styles.kicker}>WHY THIS MATCH</Text><Text style={styles.helper}>For {match.name}, the coach sees:</Text><View style={aiStyles.reasonRow}>{(reasons.length?reasons:['Serious intent','Values-led profile','Compatible lifestyle']).map(reason=><View key={reason} style={aiStyles.reasonPill}><MiniPremiumIcon name="sparkles" tone="gold" size={21} iconSize={10}/><Text style={aiStyles.reasonText}>{reason}</Text></View>)}</View><Text style={styles.helper}>No percentages are shown. The algorithm keeps scoring internal and explains matches in plain language.</Text></View>
    <View style={coachStyles.boundaryCard}><PremiumIcon name="lock-closed" tone="gold" size={44} iconSize={19}/><View style={{flex:1}}><Text style={styles.cardTitle}>Privacy boundary</Text><Text style={styles.helper}>Coach never reads phone search history, contacts, external chats or photos you did not choose.</Text></View></View>
    <Button label="Tune my match filters" variant="secondary" icon="options" onPress={onOpenFilters}/>
  </ScrollView></SafeAreaView></LinearGradient>
}

function EventsHub({mode,defaultCity,onBack,onOpenDatePlan,onOpenTool,navigate}:{mode:ExperienceMode;defaultCity:string;onBack:()=>void;onOpenDatePlan:(place?:PlaceItem)=>void;onOpenTool:(tool:Exclude<CoupleLaunchTool,null>)=>void;navigate:(screen:Screen)=>void}){
  const {width}=useWindowDimensions();
  const compactMarket=width<430;
  const [section,setSection]=useState<'places'|'packages'|'events'>('places');
  const [query,setQuery]=useState('');
  const [kind,setKind]=useState<'All'|PlaceKind>('All');
  // Marketplace opens nationally; a member can narrow to any USA/Canada city.
  const [marketCity,setMarketCity]=useState('');
  const [radius,setRadius]=useState(100);
  const [safeOnly,setSafeOnly]=useState(false);
  const [reservableOnly,setReservableOnly]=useState(false);
  const [communityOnly,setCommunityOnly]=useState(false);
  const [premiumOnly,setPremiumOnly]=useState(false);
  const [plannerOpen,setPlannerOpen]=useState(false);
  const [saved,setSaved]=useState<string[]>([]);
  const [selected,setSelected]=useState<PlaceItem|null>(null);
  const [rsvpEvent,setRsvpEvent]=useState<typeof eventExperiences[number]|null>(null);
  const [bundleCheckout,setBundleCheckout]=useState<CoupleBundle|null>(null);
  const [partnerOpen,setPartnerOpen]=useState(false);
  const [partnerStatus,setPartnerStatus]=useState('');
  const [partnerRequest,setPartnerRequest]=useState<PartnerRequest>({venue:'',city:'New York, NY',contact:'',packageTitle:'First Date Safe Café'});
  const [livePlaces,setLivePlaces]=useState<LivePlace[]>([]);
  const [liveSearchState,setLiveSearchState]=useState<'idle'|'loading'|'ready'|'error'>('idle');
  const [liveSearchError,setLiveSearchError]=useState('');
  const [cityPickerVisible,setCityPickerVisible]=useState(false);
  const visibleExperiences=mode==='couple'?coupleExperiences:eventExperiences;
  const normalized=query.trim().toLowerCase();
  const selectedCoordinates=cityCoordinates[marketCity];
  const getDistance=(place:PlaceItem)=>{
    const placeCoordinates=cityCoordinates[place.city];
    return selectedCoordinates&&placeCoordinates?distanceMiles(selectedCoordinates,placeCoordinates):Number.POSITIVE_INFINITY;
  };
  useEffect(()=>{
    if (!isSupabaseConfigured || !marketCity) { setLivePlaces([]); setLiveSearchState('idle'); setLiveSearchError(''); return; }
    let cancelled=false;
    setLiveSearchState('loading');
    const timer=setTimeout(()=>{
      void searchLivePlaces({city:marketCity,query,category:kind}).then(result=>{
        if(!cancelled){setLivePlaces(result);setLiveSearchState('ready');setLiveSearchError('');}
      }).catch(error=>{
        if(!cancelled){setLivePlaces([]);setLiveSearchState('error');setLiveSearchError(error instanceof Error?error.message:'Live place search is temporarily unavailable.');}
      });
    },450);
    return ()=>{cancelled=true;clearTimeout(timer)};
  },[marketCity,query,kind]);
  const liveDirectory:PlaceItem[]=livePlaces.map(place=>({
    id:place.id,name:place.name,city:marketCity,country:marketCity.endsWith(', ON')||marketCity.endsWith(', BC')||marketCity.endsWith(', QC')||marketCity.endsWith(', AB')||marketCity.endsWith(', MB')||marketCity.endsWith(', NS')||marketCity.endsWith(', SK')?'Canada':'USA',kind:place.category,area:place.address,price:place.rating?`${place.rating.toFixed(1)} stars`:'See venue',vibe:`A lovely ${place.category.toLowerCase()} idea${place.openNow===true?' · Open now':place.openNow===false?' · Closed now':''}`,bestTime:'Check live hours',safety:'Public venue; confirm opening hours and meeting details before you travel.',icon:'📍',tags:['live nearby',place.rating ? `${place.rating} rating` : ''],rating:place.rating,ratingCount:place.ratingCount,mapsUrl:place.mapsUrl,
  }));
  const directory=[...liveDirectory,...placeDirectory.filter(item=>!liveDirectory.some(live=>live.name===item.name))];
  const filtered=directory.filter(place=>{
    const text=placeSearchText(place);
    return (!normalized||text.includes(normalized))
      &&(kind==='All'||place.kind===kind)
      &&(!selectedCoordinates||getDistance(place)<=radius)
      &&(!safeOnly||isSafeFirstDatePlace(place))
      &&(!reservableOnly||isReservablePlace(place))
      &&(!communityOnly||isCommunityPlace(place))
      &&(!premiumOnly||isPremiumPlace(place));
  }).sort((left,right)=>{
    const ratingDifference=(right.rating??0)-(left.rating??0);
    if(ratingDifference!==0)return ratingDifference;
    const reviewDifference=(right.ratingCount??0)-(left.ratingCount??0);
    return reviewDifference!==0?reviewDifference:getDistance(left)-getDistance(right);
  });
  const featured=filtered.slice(0,8);
  const dateMoments=(['Restaurant','Cafe','Dessert','Park','Activity','Cultural','Hotel','Wellness'] as PlaceKind[]).map(category=>filtered.find(place=>place.kind===category)).filter((place):place is PlaceItem=>Boolean(place)).slice(0,5);
  const tonightPicks=filtered.filter(place=>isSafeFirstDatePlace(place)&&isReservablePlace(place)).slice(0,3);
  const rsvp=(event:typeof eventExperiences[number])=>setRsvpEvent(event);
  const toggleSaved=(id:string)=>setSaved(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  const updatePartnerRequest=(key:keyof PartnerRequest,value:string)=>setPartnerRequest(current=>({...current,[key]:value}));
  const submitPartnerRequest=()=>{
    setPartnerStatus(`${partnerRequest.venue.trim()||'Partner venue'} has been sent to our ${partnerRequest.city} curation team.`);
    setPartnerOpen(false);
  };
  return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}>
    <SafeAreaView style={shared.safe}>
      <View style={coachStyles.header}>
        <Pressable onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable>
        <Text style={[styles.cardTitle,{marginLeft:12}]}>Date Marketplace</Text>
      </View>
      <ScrollView contentContainerStyle={coachStyles.content} showsVerticalScrollIndicator={false}>
        <View style={[coachStyles.hero,compactMarket&&marketplaceBrandStyles.heroCompact]}>
          <PremiumIcon name="calendar" tone="rose" size={compactMarket?56:70} iconSize={compactMarket?26:32}/>
          <Text style={launchStyles.scriptHero}>Meet beyond the swipe</Text>
          <Text style={[shared.h1,{textAlign:'center'},compactMarket&&marketplaceBrandStyles.titleCompact]}>Plan the whole date.</Text>
          <Text style={[shared.body,{textAlign:'center'},compactMarket&&marketplaceBrandStyles.bodyCompact]}>Curated places, thoughtful packages and hosted events for serious couples.</Text>
        </View>
        <View style={coachStyles.eventStats}>
          <EventStat value={liveSearchState==='loading'?'Searching…':livePlaces.length?`${livePlaces.length} live`:`${placeDirectory.length}+`} label={livePlaces.length?'nearby ideas':'curated picks'}/>
          <EventStat value={marketCity?`${radius} mi`:'USA + Canada'} label={marketCity?`around ${marketCity.split(',')[0]}`:'browse every city'}/>
          <EventStat value="Public-first" label="safety standard"/>
        </View>
        <View style={styles.segment}>
          <Segment label="Places" active={section==='places'} onPress={()=>setSection('places')}/>
          <Segment label="Date packages" active={section==='packages'} onPress={()=>setSection('packages')}/>
          <Segment label={mode==='couple'?'Experiences':'Events'} active={section==='events'} onPress={()=>setSection('events')}/>
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{expanded:plannerOpen}} onPress={()=>setPlannerOpen(value=>!value)} style={marketplaceBrandStyles.plannerToggle}>
          <MiniPremiumIcon name="sparkles" tone="gold" size={38} iconSize={17}/>
          <View style={{flex:1}}><Text style={marketplaceBrandStyles.plannerTitle}>Build the complete date</Text><Text style={marketplaceBrandStyles.plannerBody}>Dining, experiences and arrival details in one plan</Text></View>
          <Ionicons name={plannerOpen?'chevron-up':'chevron-down'} size={20} color={colors.gold}/>
        </Pressable>
        {plannerOpen&&<CouplesPlanBuilder city={marketCity} radius={radius} onCityChange={setMarketCity} onRadiusChange={setRadius} onExplore={()=>{setSection('places');setPlannerOpen(false)}} onBook={setBundleCheckout}/>} 
        {section==='places'&&<>
        <View style={coachStyles.searchPanel}>
          <View style={selectorStyles.searchBox}>
            <MiniPremiumIcon name="search" tone="rose" size={32} iconSize={15}/>
            <TextInput value={query} onChangeText={setQuery} placeholder="Search: safe café, Indian dinner, NYC tourist..." placeholderTextColor="#6F6875" style={selectorStyles.searchInput}/>
            {!!query&&<Pressable onPress={()=>setQuery('')}><MiniPremiumIcon name="close-circle" tone="dark" size={30} iconSize={14}/></Pressable>}
          </View>
          <View style={selectorStyles.searchBox}>
            <MiniPremiumIcon name="location" tone="gold" size={32} iconSize={15}/>
            <Pressable accessibilityRole="button" accessibilityLabel="Choose a USA or Canada city" onPress={()=>setCityPickerVisible(true)} style={{flex:1}}>
              <Text numberOfLines={1} style={[selectorStyles.searchInput,!marketCity&&{color:'#6F6875'}]}>{marketCity||'Choose a USA or Canada city'}</Text>
            </Pressable>
            {!!marketCity&&<Pressable accessibilityRole="button" accessibilityLabel="Show all USA and Canada places" onPress={()=>setMarketCity('')}><MiniPremiumIcon name="close-circle" tone="dark" size={30} iconSize={14}/></Pressable>}
          </View>
          <Pressable accessibilityRole="button" onPress={()=>setCityPickerVisible(true)} style={marketplaceBrandStyles.cityChooser}><MiniPremiumIcon name="location-outline" tone="gold" size={28} iconSize={13}/><Text style={marketplaceBrandStyles.cityChooserText}>{marketCity?'Change city':'Search all USA and Canada cities'}</Text><Ionicons name="chevron-forward" size={16} color={colors.gold}/></Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
            {placeKinds.map(option=><Pressable key={option} onPress={()=>setKind(option)} style={[coachStyles.filterPill,kind===option&&coachStyles.filterPillOn]}><Text style={[coachStyles.filterText,kind===option&&{color:colors.ivory}]}>{option}</Text></Pressable>)}
          </ScrollView>
        </View>
        <TonightSafePicks places={tonightPicks} getDistance={getDistance} onDetail={setSelected} onPlan={onOpenDatePlan}/>
        <View style={coachStyles.marketFilterGrid}>
          <MarketToggle icon="shield-checkmark" label="First date safe near me" active={safeOnly} onPress={()=>setSafeOnly(value=>!value)}/>
          <MarketToggle icon="calendar" label="Reservation-ready" active={reservableOnly} onPress={()=>setReservableOnly(value=>!value)}/>
          <MarketToggle icon="people" label="Indian/community" active={communityOnly} onPress={()=>setCommunityOnly(value=>!value)}/>
          <MarketToggle icon="diamond" label="Premium / invite" active={premiumOnly} onPress={()=>setPremiumOnly(value=>!value)}/>
        </View>
        <View style={coachStyles.boundaryCard}>
          <PremiumIcon name="shield-checkmark" tone="gold" size={44} iconSize={19}/>
          <View style={{flex:1}}>
            <Text style={styles.cardTitle}>Safer date rule</Text>
            <Text style={styles.helper}>First meetings should be public, easy to leave, and never require sharing home address or private transport. Check-ins are on by default in Date Concierge.</Text>
          </View>
        </View>
        <View style={{gap:12}}>
          <View style={shared.row}>
          <Text style={styles.sectionLabel}>{query||kind!=='All'||safeOnly||reservableOnly||communityOnly||premiumOnly?'SEARCH RESULTS':`BEST WITHIN ${radius} MILES`}</Text>
            <View style={shared.spacer}/>
            <Text style={coachStyles.resultCount}>{filtered.length} found · {saved.length} saved</Text>
          </View>
          {marketCity&&kind==='All'&&dateMoments.length>0&&<View style={{gap:10}}><Text style={styles.sectionLabel}>FIVE LOVELY IDEAS IN {marketCity.toUpperCase()}</Text><Text style={styles.helper}>A dinner, a sweet stop, a walk and a little quality time - picked from the highest-rated nearby ideas.</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10}}>{dateMoments.map(place=><Pressable key={`moment-${place.id}`} accessibilityRole="button" onPress={()=>{setKind(place.kind);setSelected(place)}} style={marketplaceBrandStyles.dateMoment}><MiniPremiumIcon name={placeKindIcon(place.kind)} tone={place.kind==='Park'||place.kind==='Cultural'?'gold':'rose'} size={32} iconSize={15}/><Text style={marketplaceBrandStyles.dateMomentKind}>{place.kind}</Text><Text numberOfLines={2} style={marketplaceBrandStyles.dateMomentName}>{place.name}</Text><Text style={marketplaceBrandStyles.dateMomentMeta}>{place.rating?`${place.rating.toFixed(1)} rating`:'Lovely nearby pick'}</Text></Pressable>)}</ScrollView></View>}
          {liveSearchState==='error'&&<Text style={[styles.helper,{textAlign:'center'}]}>{liveSearchError||'Showing curated picks while live Places search reconnects.'}</Text>}
          {featured.map(place=><PlaceCard key={place.id} place={place} distance={getDistance(place)} saved={saved.includes(place.id)} onSave={()=>toggleSaved(place.id)} onDetail={()=>setSelected(place)} onPlan={()=>onOpenDatePlan(place)}/>)}
        </View>
        {filtered.length>8&&<View style={{gap:12}}>
          <Text style={styles.sectionLabel}>MORE OPTIONS</Text>
          {filtered.slice(8,14).map(place=><PlaceCard key={place.id} compact place={place} distance={getDistance(place)} saved={saved.includes(place.id)} onSave={()=>toggleSaved(place.id)} onDetail={()=>setSelected(place)} onPlan={()=>onOpenDatePlan(place)}/>)}
          {filtered.length>14&&<Text style={[styles.helper,{textAlign:'center'}]}>Use city, category or search to explore all {filtered.length} matching places.</Text>}
        </View>}
        {!filtered.length&&<View style={[shared.card,{alignItems:'center',gap:10}]}>
          <PremiumIcon name="search" tone="ruby" size={54} iconSize={25}/>
          <Text style={styles.cardTitle}>No place found</Text>
          <Text style={[styles.helper,{textAlign:'center'}]}>Try a city, restaurant, café, park, tourist place, lounge or activity keyword.</Text>
        </View>}
        </>}
        {section==='packages'&&<>
        <View style={coachStyles.boundaryCard}>
          <PremiumIcon name="sparkles" tone="gold" size={44} iconSize={19}/>
          <View style={{flex:1}}><Text style={styles.cardTitle}>Curated date packages</Text><Text style={styles.helper}>Pick a low-pressure café, an activity, dinner or a premium hosted experience. Every package includes a public-place safety plan.</Text></View>
        </View>
        <View style={{gap:12}}>
          <View style={shared.row}>
            <Text style={styles.sectionLabel}>DATE PACKAGES</Text>
            <View style={shared.spacer}/>
            <Pressable onPress={()=>onOpenDatePlan()}><Text style={coachStyles.inlineLink}>Open concierge</Text></Pressable>
          </View>
          {datePackages.map(item=><DatePackageCard key={item.id} item={item} onPlan={()=>onOpenDatePlan()}/>)}
        </View>
        <ReservationOpsCard/>
        <Button label="Open Date Concierge" icon="calendar" onPress={()=>onOpenDatePlan()}/>
        </>}
        {section==='events'&&<>
        <View style={coachStyles.boundaryCard}>
          <PremiumIcon name="people" tone="ruby" size={44} iconSize={19}/>
          <View style={{flex:1}}><Text style={styles.cardTitle}>{mode==='couple'?'Do something memorable together':'Meet through shared culture and intent'}</Text><Text style={styles.helper}>{mode==='couple'?'Hosted classes, culture nights and easy-to-book experiences designed for two.':'Verified mixers, video speed dates, community nights and small hosted dinners for serious singles.'}</Text></View>
        </View>
        <View style={{gap:12}}>
          <Text style={styles.sectionLabel}>{mode==='couple'?'COUPLE EXPERIENCES · CLASSES · CULTURE NIGHTS':'INDIAN MIXERS · VIDEO SPEED DATES · PREMIUM DINNERS'}</Text>
          {visibleExperiences.map((event,index)=><View key={event.title} style={coachStyles.eventCard}>
            <PremiumIcon name={(index===0?'cafe':index===1?'musical-notes':index===4?'videocam':index>=6?'restaurant':'heart') as keyof typeof Ionicons.glyphMap} tone={index%2?'gold':'ruby'} size={50} iconSize={23}/>
            <View style={{flex:1}}>
              <View style={shared.row}>
                <Text style={styles.cardTitle}>{event.title}</Text>
                <View style={shared.spacer}/>
                <View style={coachStyles.eventType}><Text style={coachStyles.eventTypeText}>{event.type}</Text></View>
              </View>
              <Text style={coachStyles.eventMeta}>{event.city} · {event.date}</Text>
              <Text style={styles.helper}>{event.body}</Text>
              <View style={coachStyles.eventFooter}>
                <View style={coachStyles.eventTag}><PremiumIcon name="shield-checkmark" tone="gold" size={24} iconSize={11}/><Text style={coachStyles.eventTagText}>{event.tag}</Text></View>
                <Pressable onPress={()=>rsvp(event)} style={coachStyles.rsvpButton}><Text style={coachStyles.rsvpText}>Details & RSVP</Text></Pressable>
              </View>
            </View>
          </View>)}
        </View>
        </>}
        <Text style={styles.legal}>Availability and hours can change. Confirm details before you travel, and meet in public.</Text>
      </ScrollView>
      <PlaceDetailModal place={selected} distance={selected?getDistance(selected):undefined} saved={!!selected&&saved.includes(selected.id)} onClose={()=>setSelected(null)} onSave={()=>selected&&toggleSaved(selected.id)} onPlan={()=>{if(selected)onOpenDatePlan(selected)}}/>
      <CityPickerSheet visible={cityPickerVisible} value={marketCity} onClose={()=>setCityPickerVisible(false)} onSelect={value=>{setMarketCity(value);setCityPickerVisible(false)}}/>
      <EventRsvpSheet event={rsvpEvent} onClose={()=>setRsvpEvent(null)} onPlan={()=>{setRsvpEvent(null);onOpenDatePlan()}}/>
      <PartnerInterestSheet visible={partnerOpen} request={partnerRequest} onChange={updatePartnerRequest} onClose={()=>setPartnerOpen(false)} onSubmit={submitPartnerRequest}/>
      <MarketplaceCheckoutSheet bundle={bundleCheckout} onClose={()=>setBundleCheckout(null)}/>
      <BottomNav active="events" mode={mode} onOpenTool={onOpenTool} navigate={navigate}/>
    </SafeAreaView>
  </LinearGradient>
}

function CouplesPlanBuilder({city,radius,onCityChange,onRadiusChange,onExplore,onBook}:{city:string;radius:number;onCityChange:(city:string)=>void;onRadiusChange:(radius:number)=>void;onExplore:()=>void;onBook:(bundle:CoupleBundle)=>void}){
  const [mood,setMood]=useState('Cozy');
  const [budget,setBudget]=useState('Under $100');
  const [ready,setReady]=useState(false);
  const [showCitySuggestions,setShowCitySuggestions]=useState(false);
  const moods=['Cozy','Playful','Romantic','Luxury'];
  const budgets=['Under $100','$100–$400','$400–$900','Luxury'];
  const bundleIndex=Math.max(0,budgets.indexOf(budget));
  const baseBundle=coupleBundles[bundleIndex]??coupleBundles[0]!;
  const bundle:{id:string;title:string;city:string;price:string;priceCents:number;duration:string;mood:string;icon:keyof typeof Ionicons.glyphMap;includes:string[];flexibility:string;safety:string}={...baseBundle,city:city.trim()||baseBundle.city,mood};
  const cityMatches=citySuggestions.filter(option=>!city.trim()||option.toLowerCase().includes(city.trim().toLowerCase())).slice(0,6);
  return <View style={couplesMarketStyles.builder}>
    <View style={shared.row}><PremiumIcon name="sparkles" tone="gold" size={52} iconSize={24}/><View style={{flex:1,marginLeft:10}}><Text style={styles.kicker}>DESTINYONE COMPLETE PLAN</Text><Text style={styles.cardTitle}>One booking. Your whole date.</Text><Text style={styles.helper}>Stay, dining, experiences, surprises and arrival details in one itinerary.</Text></View></View>
    <View style={{gap:8}}><View style={selectorStyles.searchBox}><MiniPremiumIcon name="location" tone="rose" size={32} iconSize={15}/><TextInput value={city} onFocus={()=>setShowCitySuggestions(true)} onChangeText={(value)=>{onCityChange(value);setShowCitySuggestions(true);setReady(false)}} placeholder="Any USA or Canada city / postal code" placeholderTextColor="#71626A" style={selectorStyles.searchInput}/>{!!city&&<Pressable accessibilityRole="button" accessibilityLabel="Clear marketplace city" onPress={()=>{onCityChange('');setShowCitySuggestions(true);setReady(false)}}><MiniPremiumIcon name="close-circle" tone="dark" size={30} iconSize={14}/></Pressable>}</View>{showCitySuggestions&&<View style={selectorStyles.suggestionPanel}>{cityMatches.length?cityMatches.map(option=><Pressable accessibilityRole="button" accessibilityLabel={`Use ${option}`} key={option} onPress={()=>{onCityChange(option);setShowCitySuggestions(false);setReady(false)}} style={selectorStyles.suggestionRow}><MiniPremiumIcon name="location-outline" tone={option===city?'gold':'rose'} size={26} iconSize={12}/><Text style={selectorStyles.suggestionText}>{option}</Text>{option===city&&<MiniPremiumIcon name="checkmark-circle" tone="gold" size={24} iconSize={11}/>}</Pressable>):<View style={selectorStyles.suggestionRow}><Text style={selectorStyles.suggestionText}>Choose a suggested USA or Canada city for accurate radius results.</Text></View>}</View>}</View>
    <View style={{gap:8}}><View style={shared.row}><Text style={styles.sectionLabel}>NEARBY RANGE</Text><View style={shared.spacer}/><Text style={coachStyles.resultCount}>from {city||'your city'}</Text></View><View style={couplesMarketStyles.choiceRow}>{[25,50,100].map(option=><Pressable accessibilityRole="button" accessibilityLabel={`${option} mile radius`} key={option} onPress={()=>{onRadiusChange(option);setReady(false)}} style={[couplesMarketStyles.choice,radius===option&&couplesMarketStyles.choiceOn]}><Text style={[couplesMarketStyles.choiceText,radius===option&&{color:colors.ivory}]}>{option} miles</Text></Pressable>)}</View></View>
    <View style={{gap:8}}><Text style={styles.sectionLabel}>MOOD</Text><View style={couplesMarketStyles.choiceRow}>{moods.map(option=><Pressable key={option} onPress={()=>{setMood(option);setReady(false)}} style={[couplesMarketStyles.choice,mood===option&&couplesMarketStyles.choiceOn]}><Text style={[couplesMarketStyles.choiceText,mood===option&&{color:colors.ivory}]}>{option}</Text></Pressable>)}</View></View>
    <View style={{gap:8}}><Text style={styles.sectionLabel}>TOTAL BUDGET</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{budgets.map(option=><Pressable key={option} onPress={()=>{setBudget(option);setReady(false)}} style={[couplesMarketStyles.budget,budget===option&&couplesMarketStyles.budgetOn]}><Text style={[couplesMarketStyles.choiceText,budget===option&&{color:colors.ivory}]}>{option}</Text></Pressable>)}</ScrollView></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:9}}>{marketplaceBookingTypes.map(item=><View key={item.title} style={couplesMarketStyles.bookingType}><MiniPremiumIcon name={item.icon} tone={item.tone} size={32} iconSize={15}/><Text style={couplesMarketStyles.bookingTypeTitle}>{item.title}</Text><Text style={couplesMarketStyles.bookingTypeBody}>{item.body}</Text></View>)}</ScrollView>
    {!ready?<View style={{gap:9}}><Button label={`Show best within ${radius} miles`} icon="location" variant="secondary" onPress={()=>{setShowCitySuggestions(false);onExplore()}}/><Button label="Build complete itinerary" icon="sparkles" onPress={()=>{setShowCitySuggestions(false);setReady(true)}}/></View>:<View style={couplesMarketStyles.generated}>
      <View style={shared.row}><PremiumIcon name={bundle.icon} tone={bundle.mood==='Luxury'?'gold':'ruby'} size={48} iconSize={22}/><View style={{flex:1,marginLeft:9}}><Text style={styles.cardTitle}>{bundle.title}</Text><Text style={coachStyles.eventMeta}>{bundle.city} · {bundle.duration} · {bundle.price}</Text></View><MiniPremiumIcon name="checkmark-circle" tone="gold" size={34} iconSize={16}/></View>
      <View style={couplesMarketStyles.itinerary}>{bundle.includes.map((item,index)=><View key={item} style={couplesMarketStyles.itineraryRow}><View style={couplesMarketStyles.stepNumber}><Text style={couplesMarketStyles.stepNumberText}>{index+1}</Text></View><Text style={couplesMarketStyles.itineraryText}>{item}</Text></View>)}</View>
      <View style={couplesMarketStyles.policyRow}><MiniPremiumIcon name="refresh-circle" tone="gold" size={28} iconSize={13}/><Text style={couplesMarketStyles.policyText}>{bundle.flexibility}</Text></View>
      <View style={couplesMarketStyles.policyRow}><MiniPremiumIcon name="shield-checkmark" tone="rose" size={28} iconSize={13}/><Text style={couplesMarketStyles.policyText}>{bundle.safety}</Text></View>
      <Button label="Save complete date plan" icon="bookmark" variant="gold" onPress={()=>onBook(bundle)}/>
      <Pressable onPress={()=>setReady(false)} style={couplesMarketStyles.startOver}><Text style={couplesMarketStyles.startOverText}>Change plan</Text></Pressable>
    </View>}
  </View>
}

function MarketplaceCheckoutSheet({bundle,onClose}:{bundle:CoupleBundle|null;onClose:()=>void}){
  const [payment,setPayment]=useState('Card');
  const [status,setStatus]=useState<MarketplaceBookingStatus>('quote_ready');
  const [cancelled,setCancelled]=useState(false);
  useEffect(()=>{setStatus('quote_ready');setCancelled(false);setPayment('Card')},[bundle?.id,bundle?.city]);
  if(!bundle)return null;
  const confirmation=`DO-${bundle.id.toUpperCase().slice(0,6)}-2026`;
  const confirmed=status==='confirmed';
  const timeline=buildMarketplaceBookingTimeline(status);
  const advance=()=>setStatus(current=>current==='quote_ready'?'awaiting_match_acceptance':current==='awaiting_match_acceptance'?'awaiting_payment':current==='awaiting_payment'?'provider_confirming':'confirmed');
  const actionLabel=status==='quote_ready'?'Share plan for acceptance':status==='awaiting_match_acceptance'?'Mark both as ready':status==='awaiting_payment'?`Save ${payment} preference`:status==='provider_confirming'?'Finish date plan':'Manage saved plan';
  const refund=calculateMarketplaceRefund({amountCents:bundle.priceCents,cancellationCutoffAt:new Date(Date.now()+24*60*60*1000).toISOString(),cancelledAt:new Date().toISOString()});
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={chatStyles.sheet}><SheetHeader title={cancelled?'Plan cancelled':confirmed?'Date plan saved':'Make this date yours'} subtitle={`${bundle.city} · ${bundle.duration}`} onClose={onClose}/><ScrollView contentContainerStyle={{gap:12,paddingBottom:10}} showsVerticalScrollIndicator={false}>
    <View style={couplesMarketStyles.checkoutHero}><PremiumIcon name={cancelled?'refresh-circle':confirmed?'checkmark-circle':'wallet'} tone="gold" size={56} iconSize={26}/><View style={{flex:1}}><Text style={styles.cardTitle}>{cancelled?'Plan removed':confirmed?'Your complete plan is ready':bundle.title}</Text><Text style={styles.helper}>{cancelled?'Nothing was booked or charged.':confirmed?`Plan reference ${confirmation}`:'Choose the details together, then keep the itinerary in one private place.'}</Text></View></View>
    <View style={coachStyles.detailRows}><DetailRow icon="location-outline" label="Destination" value={bundle.city}/><DetailRow icon="time-outline" label="Duration" value={bundle.duration}/><DetailRow icon="receipt-outline" label="Estimated total" value={bundle.price}/><DetailRow icon="refresh-circle-outline" label="Changes" value={bundle.flexibility}/></View>
    {!cancelled&&<View style={coachStyles.marketPillarGrid}>{timeline.map(item=>{const current=item.status===status;const complete=timeline.findIndex(step=>step.status===item.status)<timeline.findIndex(step=>step.status===status)||confirmed;return <View key={item.status} style={[coachStyles.marketPillar,(current||complete)&&coachStyles.marketPillarOn]}><MiniPremiumIcon name={complete?'checkmark-circle':current?'radio-button-on':'ellipse-outline'} tone={complete?'gold':current?'rose':'dark'} size={24} iconSize={11}/><View style={{flex:1}}><Text style={coachStyles.marketPillarTitle}>{item.title}</Text><Text style={coachStyles.marketPillarBody}>{item.body}</Text></View></View>})}</View>}
    <View style={couplesMarketStyles.checkoutItems}>{bundle.includes.map((item,index)=><View key={item} style={couplesMarketStyles.checkoutItem}><MiniPremiumIcon name={index===0?'bed':index===1?'restaurant':index===2?'ticket':'sparkles'} tone={index%2?'ruby':'gold'} size={32} iconSize={15}/><View style={{flex:1}}><Text style={couplesMarketStyles.checkoutItemTitle}>{item}</Text><Text style={couplesMarketStyles.checkoutItemMeta}>{cancelled?'Released in preview':confirmed?'Grouped under one confirmation':'Freshness rechecked before payment'}</Text></View>{confirmed&&!cancelled&&<MiniPremiumIcon name="checkmark-circle" tone="gold" size={26} iconSize={12}/>}</View>)}</View>
    {!confirmed&&!cancelled&&status==='awaiting_payment'&&<><Text style={styles.sectionLabel}>PAYMENT</Text><View style={couplesMarketStyles.paymentRow}>{['Card','Apple Pay','Google Pay'].map(option=><Pressable key={option} onPress={()=>setPayment(option)} style={[couplesMarketStyles.paymentChoice,payment===option&&couplesMarketStyles.paymentChoiceOn]}><MiniPremiumIcon name={option==='Card'?'card':option==='Apple Pay'?'logo-apple':'logo-google'} tone={payment===option?'gold':'dark'} size={28} iconSize={13}/><Text style={[couplesMarketStyles.paymentText,payment===option&&{color:colors.ivory}]}>{option}</Text></Pressable>)}</View></>}
    {!confirmed&&!cancelled&&<><View style={couplesMarketStyles.totalRow}><Text style={styles.cardTitle}>Estimated total</Text><Text style={couplesMarketStyles.totalPrice}>{bundle.price}</Text></View><Button label={actionLabel} icon={status==='quote_ready'?'share-outline':status==='awaiting_match_acceptance'?'people':status==='awaiting_payment'?'lock-closed':'business'} onPress={advance}/></>}
    {confirmed&&!cancelled&&<><View style={coachStyles.savedNote}><MiniPremiumIcon name="shield-checkmark" tone="gold" size={28} iconSize={13}/><Text style={coachStyles.savedNoteText}>Receipt, provider confirmation, change policy and one support contact stay with this itinerary.</Text></View><Button label="Request cancellation" icon="refresh-circle" variant="secondary" onPress={()=>setCancelled(true)}/><Button label="Done" icon="checkmark" onPress={onClose}/></>}
    {cancelled&&<><View style={coachStyles.savedNote}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={28} iconSize={13}/><Text style={coachStyles.savedNoteText}>{refund.reason} Production waits for the payment webhook before showing refund complete.</Text></View><Button label="Done" icon="checkmark" onPress={onClose}/></>}
    <Text style={styles.legal}>This preview saves a date plan only. Live reservations and payments activate after each venue connection, live availability check and secure payment setup are complete.</Text>
  </ScrollView></SafeAreaView></Modal>
}

function DateMarketplaceCard({snapshot}:{snapshot:DateMarketplaceSnapshot}){
  return <View style={coachStyles.marketReadinessCard}>
    <View style={shared.row}>
      <PremiumIcon name={snapshot.ready?'checkmark-circle':'construct'} tone={snapshot.ready?'gold':'ruby'} size={52} iconSize={24}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>DATE MARKETPLACE READINESS</Text>
        <Text style={styles.cardTitle}>{snapshot.ready?'Marketplace preview ready':'Marketplace needs attention'} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} pillars ready before live providers are connected.</Text>
      </View>
    </View>
    <View style={coachStyles.marketPillarGrid}>
      {snapshot.pillars.map(pillar=><View key={pillar.id} style={[coachStyles.marketPillar,pillar.ready&&coachStyles.marketPillarOn]}>
        <MiniPremiumIcon name={pillar.ready?'checkmark-circle':'ellipse-outline'} tone={pillar.ready?'gold':'dark'} size={24} iconSize={11}/>
        <View style={{flex:1}}>
          <Text style={coachStyles.marketPillarTitle}>{pillar.title}</Text>
          <Text style={coachStyles.marketPillarBody}>{pillar.body}</Text>
        </View>
      </View>)}
    </View>
  </View>
}

function LiveMarketplaceOpsCard({snapshot}:{snapshot:MarketplaceOpsSnapshot}){
  return <View style={coachStyles.liveOpsCard}>
    <View style={shared.row}>
      <PremiumIcon name={snapshot.status==='Ready for live ops'?'rocket':'construct-outline'} tone={snapshot.status==='Ready for live ops'?'gold':'ruby'} size={52} iconSize={24}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>LIVE MARKETPLACE OPS</Text>
        <Text style={styles.cardTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>Source controls {snapshot.sourceControlScore}% · live readiness {snapshot.readyCount}/{snapshot.total}. Real bookings still require providers, contracts and staffed support.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={coachStyles.liveOpsNext}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={coachStyles.liveOpsNextText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={coachStyles.opsCityGrid}>{snapshot.cityCoverage.map(city=><View key={city.city} style={coachStyles.opsCityCard}>
      <Text style={coachStyles.opsCityName}>{city.city}</Text>
      <Text style={coachStyles.opsCityMeta}>{city.partnerLeads} leads · {city.signedPartners} signed</Text>
      <Text style={coachStyles.opsCityMeta}>{city.eventHosts} host · {city.monthlyEvents}/mo · {city.capacitySeats} seats</Text>
    </View>)}</View>
    <View style={coachStyles.marketPillarGrid}>
      {snapshot.pillars.map(pillar=><View key={pillar.id} style={[coachStyles.marketPillar,pillar.ready&&coachStyles.marketPillarOn]}>
        <MiniPremiumIcon name={pillar.ready?'checkmark-circle':'construct-outline'} tone={pillar.ready?'gold':'rose'} size={24} iconSize={11}/>
        <View style={{flex:1}}>
          <Text style={coachStyles.marketPillarTitle}>{pillar.title}</Text>
          <Text style={coachStyles.marketPillarBody}>{pillar.body}</Text>
          {!pillar.ready&&<Text style={coachStyles.marketPillarNext}>Next: {pillar.nextStep}</Text>}
        </View>
      </View>)}
    </View>
  </View>
}

function CityLaunchRoadmap(){
  return <View style={coachStyles.launchRoadmap}>
    <View style={shared.row}>
      <PremiumIcon name="map-outline" tone="gold" size={46} iconSize={21}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.cardTitle}>Launch city roadmap</Text>
        <Text style={styles.helper}>Start where Indian/South Asian serious-dating density is highest, then expand city by city.</Text>
      </View>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:9}}>
      {launchCityRoadmap.map(item=><View key={item.city} style={coachStyles.launchCityCard}>
        <MiniPremiumIcon name={item.icon} tone={item.stage.includes('Launch')?'gold':'rose'} size={32} iconSize={15}/>
        <Text style={coachStyles.launchStage}>{item.stage}</Text>
        <Text style={coachStyles.launchCity}>{item.city}</Text>
        <Text style={coachStyles.launchFocus}>{item.focus}</Text>
        <View style={coachStyles.launchEventPill}><Text style={coachStyles.launchEventText}>{item.event}</Text></View>
      </View>)}
    </ScrollView>
  </View>
}

function MarketToggle({icon,label,active,onPress}:{icon:keyof typeof Ionicons.glyphMap;label:string;active:boolean;onPress:()=>void}){
  return <Pressable onPress={onPress} style={[coachStyles.marketToggle,active&&coachStyles.marketToggleOn]}>
    <MiniPremiumIcon name={icon} tone={active?'gold':'rose'} size={30} iconSize={14}/>
    <Text style={[coachStyles.marketToggleText,active&&{color:colors.ivory}]}>{label}</Text>
  </Pressable>
}

function DatePackageCard({item,onPlan}:{item:DatePackage;onPlan:()=>void}){
  return <View style={coachStyles.packageCard}>
    <PremiumIcon name={item.icon} tone={item.tier.includes('Executive')?'gold':'ruby'} size={54} iconSize={25}/>
    <View style={{flex:1}}>
      <View style={shared.row}>
        <View style={{flex:1}}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={coachStyles.eventMeta}>{item.city} · {item.duration}</Text>
        </View>
        <View style={coachStyles.packageTier}><Text style={coachStyles.packageTierText}>{item.tier}</Text></View>
      </View>
      <Text style={styles.helper}>{item.includes.join(' · ')}</Text>
      <View style={coachStyles.eventFooter}>
        <View style={coachStyles.eventTag}><PremiumIcon name="shield-checkmark" tone="gold" size={24} iconSize={11}/><Text style={coachStyles.eventTagText}>{item.safety}</Text></View>
      </View>
      <View style={coachStyles.packageFooter}>
        <Text style={coachStyles.packagePrice}>{item.price}</Text>
        <Pressable onPress={onPlan} style={coachStyles.rsvpButton}><Text style={coachStyles.rsvpText}>Plan package</Text></Pressable>
      </View>
    </View>
  </View>
}

function TonightSafePicks({places,getDistance,onDetail,onPlan}:{places:PlaceItem[];getDistance:(place:PlaceItem)=>number;onDetail:(place:PlaceItem)=>void;onPlan:(place?:PlaceItem)=>void}){
  return <View style={coachStyles.tonightPanel}>
    <View style={shared.row}>
      <PremiumIcon name="moon-outline" tone="ruby" size={46} iconSize={21}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.cardTitle}>Tonight-safe picks</Text>
        <Text style={styles.helper}>Quick public/reservable ideas for members who want a simple plan without endless scrolling.</Text>
      </View>
    </View>
    <View style={coachStyles.tonightGrid}>
      {places.map(place=><Pressable key={place.id} onPress={()=>onDetail(place)} style={coachStyles.tonightCard}>
        <Image source={{uri:placePhoto(place)}} style={couplesMarketStyles.tonightImage}/>
        <View style={{flex:1}}>
          <Text style={coachStyles.tonightTitle}>{place.name}</Text>
          <Text style={coachStyles.tonightBody}>{Math.round(getDistance(place))} mi · {place.bestTime}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Plan ${place.name}`} onPress={()=>onPlan(place)} style={coachStyles.tonightPlan}><Text style={coachStyles.tonightPlanText}>Plan</Text></Pressable>
      </Pressable>)}
    </View>
  </View>
}

function ReservationOpsCard(){
  return <View style={coachStyles.opsCard}>
    <View style={shared.row}>
      <PremiumIcon name="git-branch-outline" tone="gold" size={46} iconSize={21}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.cardTitle}>Reservation + safety operating model</Text>
        <Text style={styles.helper}>This is the logic a real billion-dollar marketplace needs before live bookings.</Text>
      </View>
    </View>
    <View style={coachStyles.opsGrid}>{reservationOps.map(item=><View key={item.title} style={coachStyles.opsItem}>
      <MiniPremiumIcon name={item.icon} tone="rose" size={32} iconSize={15}/>
      <Text style={coachStyles.opsTitle}>{item.title}</Text>
      <Text style={coachStyles.opsBody}>{item.body}</Text>
    </View>)}</View>
    <View style={coachStyles.checklistWrap}>{safeDateChecklist.map(item=><View key={item} style={coachStyles.safeCheckItem}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={22} iconSize={10}/><Text style={coachStyles.safeCheckText}>{item}</Text></View>)}</View>
  </View>
}

function PartnerInterestSheet({visible,request,onChange,onClose,onSubmit}:{visible:boolean;request:PartnerRequest;onChange:(key:keyof PartnerRequest,value:string)=>void;onClose:()=>void;onSubmit:()=>void}){
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={chatStyles.modalBackdrop} onPress={onClose}/>
    <SafeAreaView style={chatStyles.sheet}>
      <SheetHeader title="Add restaurant/café partner" subtitle="Preview partner intake" onClose={onClose}/>
      <View style={coachStyles.partnerIntakeHero}>
        <PremiumIcon name="storefront-outline" tone="gold" size={54} iconSize={25}/>
        <View style={{flex:1}}>
          <Text style={styles.cardTitle}>Partner package review</Text>
          <Text style={styles.helper}>Production will send this to a CRM or partner table with safety, reservation and support checks.</Text>
        </View>
      </View>
      <Field label="Venue name" value={request.venue} onChangeText={(text:string)=>onChange('venue',text)} placeholder="Example: Saffron Lounge"/>
      <Field label="City" value={request.city} onChangeText={(text:string)=>onChange('city',text)} placeholder="New York, NY"/>
      <Field label="Partner contact" value={request.contact} onChangeText={(text:string)=>onChange('contact',text)} placeholder="manager@venue.com"/>
      <View style={{gap:8}}>
        <Text style={styles.sectionLabel}>PACKAGE FIT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
          {datePackages.map(item=><Pressable key={item.id} onPress={()=>onChange('packageTitle',item.title)} style={[coachStyles.partnerPackageChip,request.packageTitle===item.title&&coachStyles.partnerPackageChipOn]}><Text style={[coachStyles.partnerPackageText,request.packageTitle===item.title&&{color:colors.ivory}]}>{item.title}</Text></Pressable>)}
        </ScrollView>
      </View>
      <Button label="Queue partner review" icon="checkmark-circle" onPress={onSubmit}/>
      <Button label="Cancel" variant="secondary" onPress={onClose}/>
      <Text style={styles.legal}>Preview only. Live partner onboarding needs contracts, payment terms, refund policy, safety SLA and provider webhooks.</Text>
    </SafeAreaView>
  </Modal>
}

function EventRsvpSheet({event,onClose,onPlan}:{event:typeof eventExperiences[number]|null;onClose:()=>void;onPlan:()=>void}){
  const [saved,setSaved]=useState(false);
  useEffect(()=>setSaved(false),[event?.title]);
  if(!event)return null;
  const groupSize=event.type==='Online'?'Private 1:1 rounds':event.type==='Private dinner'||event.type==='Invite only'?'8–12 approved guests':'Small hosted groups';
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={chatStyles.sheet}><SheetHeader title="Event details & RSVP" subtitle={`${event.city} · ${event.date}`} onClose={onClose}/><ScrollView contentContainerStyle={{gap:12,paddingBottom:8}} showsVerticalScrollIndicator={false}><View style={coachStyles.rsvpConfirm}><PremiumIcon name="ticket" tone="gold" size={58} iconSize={27}/><View style={{flex:1}}><Text style={styles.cardTitle}>{event.title}</Text><Text style={styles.helper}>{event.body}</Text></View></View><View style={coachStyles.detailRows}><DetailRow icon="location-outline" label="Location" value={event.city}/><DetailRow icon="calendar-outline" label="Schedule" value={event.date}/><DetailRow icon="people-outline" label="Group format" value={groupSize}/><DetailRow icon="shield-checkmark-outline" label="Entry standard" value={event.tag}/></View><View style={coachStyles.opsGrid}><View style={coachStyles.opsItem}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={30} iconSize={14}/><Text style={coachStyles.opsTitle}>Verified arrival</Text><Text style={coachStyles.opsBody}>Host check-in and clear community expectations before introductions begin.</Text></View><View style={coachStyles.opsItem}><MiniPremiumIcon name="chatbubbles" tone="rose" size={30} iconSize={14}/><Text style={coachStyles.opsTitle}>Guided connection</Text><Text style={coachStyles.opsBody}>Conversation prompts and small groups keep the experience warm, not awkward.</Text></View><View style={coachStyles.opsItem}><MiniPremiumIcon name="lock-closed" tone="gold" size={30} iconSize={14}/><Text style={coachStyles.opsTitle}>Private follow-up</Text><Text style={coachStyles.opsBody}>Contact details stay hidden; mutual interest can unlock an in-app chat afterward.</Text></View></View>{saved&&<View style={coachStyles.savedNote}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={28} iconSize={13}/><Text style={coachStyles.savedNoteText}>RSVP saved for this preview. Live ticket confirmation and reminders connect with the backend later.</Text></View>}<Button label={saved?'RSVP saved':'Save RSVP'} icon={saved?'checkmark-circle':'ticket-outline'} onPress={()=>setSaved(true)}/><Button label="Plan a date around this" icon="calendar" variant="gold" onPress={onPlan}/><Button label="Done" variant="secondary" onPress={onClose}/><Text style={styles.legal}>Event inventory is preview data. Production will connect tickets, capacity, payment and ID-verified check-in.</Text></ScrollView></SafeAreaView></Modal>
}

function placeKindIcon(kind:PlaceKind):keyof typeof Ionicons.glyphMap{
  return kind==='Restaurant'?'restaurant':kind==='Cafe'?'cafe':kind==='Hotel'?'bed':kind==='Wellness'?'flower':kind==='Tourist'?'camera':kind==='Activity'?'bicycle':kind==='Park'?'leaf':kind==='Dessert'?'ice-cream':kind==='Lounge'?'wine':kind==='Cultural'?'color-palette':'location';
}

function PlaceCard({place,distance,saved,compact,onSave,onDetail,onPlan}:{place:PlaceItem;distance?:number;saved:boolean;compact?:boolean;onSave:()=>void;onDetail:()=>void;onPlan:()=>void}){
  const labels=[
    isSafeFirstDatePlace(place)?'Safe first date':null,
    isReservablePlace(place)?'Reservable':null,
    isCommunityPlace(place)?'Community-friendly':null,
    isPremiumPlace(place)?'Premium':null,
  ].filter(Boolean) as string[];
  return <View style={[coachStyles.placeCard,compact&&coachStyles.placeCardCompact]}>
    <View style={[couplesMarketStyles.placePhotoWrap,compact&&couplesMarketStyles.placePhotoCompact]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${place.name}`} onPress={onDetail} style={StyleSheet.absoluteFill}>
        <Image source={{uri:placePhoto(place)}} style={couplesMarketStyles.placePhoto}/>
        <LinearGradient colors={['transparent','rgba(12,2,5,.88)']} style={StyleSheet.absoluteFill}/>
        <View style={couplesMarketStyles.photoBadges}><View style={couplesMarketStyles.distanceBadge}><MiniPremiumIcon name={placeKindIcon(place.kind)} tone="gold" size={24} iconSize={11}/><Text style={couplesMarketStyles.distanceText}>{Number.isFinite(distance)?`${Math.round(distance??0)} mi`:'Nearby'}</Text></View><View style={couplesMarketStyles.priceBadge}><Text style={couplesMarketStyles.priceBadgeText}>{place.price}</Text></View></View>
        <View style={couplesMarketStyles.photoTitle}><Text style={couplesMarketStyles.photoKind}>{place.kind.toUpperCase()}</Text><Text style={couplesMarketStyles.photoName}>{place.name}</Text><Text style={couplesMarketStyles.photoMeta}>{place.area} · {place.city}</Text></View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={saved?`Unsave ${place.name}`:`Save ${place.name}`} onPress={onSave} style={couplesMarketStyles.photoSave}><PremiumIcon name={saved?'bookmark':'bookmark-outline'} tone={saved?'gold':'dark'} size={36} iconSize={16}/></Pressable>
    </View>
    <View style={couplesMarketStyles.placeContent}>
      <View style={shared.row}>
        <Text style={[styles.cardTitle,{flex:1}]}>{place.vibe}</Text>
      </View>
      <View style={coachStyles.placeLabelRow}>{labels.slice(0,compact?2:4).map(label=><View key={label} style={coachStyles.placeLabel}><Text style={coachStyles.placeLabelText}>{label}</Text></View>)}</View>
      <View style={coachStyles.eventFooter}>
        <View style={coachStyles.eventTag}><PremiumIcon name="time-outline" tone="gold" size={24} iconSize={11}/><Text style={coachStyles.eventTagText}>{place.bestTime}</Text></View>
        {!!place.mapsUrl&&<Pressable accessibilityRole="link" accessibilityLabel={`Open directions for ${place.name}`} onPress={()=>void Linking.openURL(place.mapsUrl!)} style={coachStyles.detailsButton}><Text style={coachStyles.detailsText}>Directions</Text></Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel={`Details for ${place.name}`} onPress={onDetail} style={coachStyles.detailsButton}><Text style={coachStyles.detailsText}>Details</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Plan ${place.name}`} onPress={onPlan} style={coachStyles.rsvpButton}><Text style={coachStyles.rsvpText}>Plan</Text></Pressable>
      </View>
    </View>
  </View>
}

function PlaceDetailModal({place,distance,saved,onClose,onSave,onPlan}:{place:PlaceItem|null;distance?:number;saved:boolean;onClose:()=>void;onSave:()=>void;onPlan:()=>void}){
  if(!place)return null;
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={chatStyles.modalBackdrop} onPress={onClose}/>
    <SafeAreaView style={chatStyles.sheet}>
      <SheetHeader title={place.name} subtitle={`${place.city} · ${place.kind}`} onClose={onClose}/>
      <View style={couplesMarketStyles.detailPhotoWrap}><Image source={{uri:placePhoto(place)}} style={couplesMarketStyles.detailPhoto}/><LinearGradient colors={['transparent','rgba(12,2,5,.92)']} style={StyleSheet.absoluteFill}/><View style={couplesMarketStyles.detailPhotoCopy}><Text style={couplesMarketStyles.photoKind}>{place.kind.toUpperCase()} · {Number.isFinite(distance)?`${Math.round(distance??0)} MILES AWAY`:'NEARBY'}</Text><Text style={couplesMarketStyles.detailPhotoTitle}>{place.vibe}</Text></View></View>
      <View style={coachStyles.detailRows}>
        <DetailRow icon="cash-outline" label="Budget" value={place.price}/>
        <DetailRow icon="time-outline" label="Best time" value={place.bestTime}/>
        <DetailRow icon="shield-checkmark-outline" label="Safety note" value={place.safety}/>
        <DetailRow icon="restaurant-outline" label="Partner status" value={isReservablePlace(place)?'Partner-ready candidate · reservation adapter prepared':'Public place · verify live hours before meeting'}/>
        <DetailRow icon="calendar-outline" label="Reservation" value={isReservablePlace(place)?'Hold + quote + confirmation flow ready for API connection':'Walk-in/date-plan suggestion only'}/>
      </View>
      <View style={styles.chipRow}>{place.tags.map(tag=><Chip key={tag} label={tag}/>)}</View>
      <View style={{gap:10}}><Button label={saved?'Saved idea':'Save idea'} icon={saved?'bookmark':'bookmark-outline'} variant="secondary" onPress={onSave}/>{!!place.mapsUrl&&<Button label="Open directions" icon="navigate" variant="gold" onPress={()=>void Linking.openURL(place.mapsUrl!)}/>}<Button label="Add to our date plan" icon="calendar" onPress={onPlan}/></View>
      <Text style={styles.legal}>{place.mapsUrl?'Live venue details can change. Confirm hours before travel.':'Live hours, directions, inventory and reservation confirmation connect after the venue is activated.'}</Text>
    </SafeAreaView>
  </Modal>
}

function DetailRow({icon,label,value}:{icon:keyof typeof Ionicons.glyphMap;label:string;value:string}){return <View style={coachStyles.detailRow}><PremiumIcon name={icon} tone="ruby" size={34} iconSize={15}/><View style={{flex:1}}><Text style={coachStyles.detailLabel}>{label}</Text><Text style={coachStyles.detailValue}>{value}</Text></View></View>}

function EventStat({value,label}:{value:string;label:string}){return <View style={coachStyles.eventStat}><Text style={coachStyles.eventStatValue}>{value}</Text><Text style={coachStyles.eventStatLabel}>{label}</Text></View>}

const executiveMetrics=[
  {label:'Membership',value:'Invite-only circle',icon:'lock-closed' as const},
  {label:'Price point',value:'$5,000 / year',icon:'diamond' as const},
  {label:'Matching style',value:'Handpicked intros',icon:'people' as const},
  {label:'Privacy',value:'Hidden profile mode',icon:'shield-checkmark' as const},
];
const executiveRequirements=[
  ['Business identity','Founder, business owner, investor, doctor, lawyer, executive or senior professional.'],
  ['Serious intent','Long-term relationship or marriage only — no casual dating positioning.'],
  ['Verification','Selfie, phone/email, optional ID and business/profile verification before approval.'],
  ['Privacy standard','No public income display. Sensitive checks remain private and manual.'],
] as const;
const executiveServices=[
  {title:'Private matchmaker review',body:'A concierge reviews goals, lifestyle, city, family expectations and privacy needs before intros.',icon:'person' as const},
  {title:'Handpicked weekly introductions',body:'No endless swiping. Members receive a small set of serious, verified prospects.',icon:'heart' as const},
  {title:'VIP date planning',body:'Curated restaurant, lounge, café or private event suggestions with optional reservation holds.',icon:'calendar' as const},
  {title:'Luxury gifting',body:'Flowers, dessert, handwritten card or premium surprise gifts can be ordered inside the app.',icon:'gift' as const},
  {title:'Executive privacy mode',body:'Hide from public discovery and appear only to approved Executive Circle members.',icon:'eye-off' as const},
  {title:'Priority safety support',body:'Faster report review, scam checks, verified events and safer date check-ins.',icon:'shield-checkmark' as const},
];
const executiveMatches=[
  {name:'Rohan',age:34,role:'SaaS founder',city:'New York, NY',intent:'Marriage-minded',vibe:'Family-first · Ambitious · Private',photo:matches[4]!.photo},
  {name:'Karan',age:35,role:'Hospitality group owner',city:'Dallas, TX',intent:'Serious relationship',vibe:'Business-minded · Foodie · Spiritual',photo:matches[8]!.photo},
  {name:'Dev',age:33,role:'Venture partner',city:'San Francisco, CA',intent:'Open to marriage',vibe:'Travel · Fitness · Long-term',photo:matches[12]!.photo},
] as const;
const executiveApplicationSteps=[
  ['Application submitted','Member answers privacy, intent, city and relationship goals.'],
  ['Verification review','Selfie, optional ID, business proof and profile quality are checked privately.'],
  ['Concierge interview','A short call confirms expectations and dating boundaries.'],
  ['Approved circle','Member unlocks private intros, events, gifting and VIP date planning.'],
] as const;
function ExecutiveCircle({navigate,onBack,onOpenEvents,onOpenPricing,onOpenVerify,onOpenDatePlan}:{navigate:(s:Screen)=>void;onBack:()=>void;onOpenEvents:()=>void;onOpenPricing:()=>void;onOpenVerify:()=>void;onOpenDatePlan:()=>void}){
  const preview=memberDataRuntime.source==='preview';
  const [tab,setTab]=useState<'overview'|'apply'|'matches'|'concierge'>('overview');
  const [application,setApplication]=useState(preview?{role:'Founder / business owner',city:'New York, NY',intent:'Marriage in 12–24 months',privacy:'Hidden profile'}:{role:'',city:'',intent:'',privacy:''});
  const [conciergeNote,setConciergeNote]=useState(preview?'Plan a quiet premium dinner with serious conversation.':'');
  const [status,setStatus]=useState({title:'',body:''});
  const [applicationError,setApplicationError]=useState('');
  const [conciergeError,setConciergeError]=useState('');
  const submitApplication=()=>{setApplicationError('');if(!preview){setApplicationError('Executive application service must be connected before a private application can be submitted.');return}const missing=Object.entries(application).find(([,value])=>value.trim().length<3);if(missing){setApplicationError('Please complete every application field before submitting.');return}setStatus({title:'Application moved to private review',body:`${application.role} · ${application.city} · ${application.intent}. Next: verification + concierge interview.`});setTab('apply')};
  const requestIntro=(name:string)=>setStatus(preview?{title:`Intro request queued for ${name}`,body:'Concierge will review compatibility, privacy preference and relationship intent before any introduction is shown.'}:{title:'Verified concierge connection required',body:'No introduction was requested. Live Executive members will appear only from the approved private feed.'});
  const sendGift=(name:string)=>setStatus(preview?{title:`Luxury gift request started for ${name}`,body:'Choose Real Gift in chat to create the private accept → pay → courier flow. Recipient address remains hidden.'}:{title:'Verified fulfillment connection required',body:'No gift request was created or charged.'});
  const askConcierge=()=>{setConciergeError('');if(!preview){setConciergeError('Executive concierge messaging must be connected before this note can be sent.');return}const note=conciergeNote.trim();if(note.length<20){setConciergeError('Write at least 20 characters so concierge has useful context.');return}setStatus({title:'Concierge note saved',body:note});};
  return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}><SafeAreaView style={shared.safe}><View style={coachStyles.header}><Pressable onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable><Text style={[styles.cardTitle,{marginLeft:12}]}>Executive Circle</Text></View><ScrollView contentContainerStyle={[coachStyles.content,{paddingBottom:120}]} showsVerticalScrollIndicator={false}>
    <View style={ventureStyles.hero}>
      <PremiumIcon name="briefcase" tone="gold" size={68} iconSize={30}/>
      <Text style={launchStyles.scriptHero}>Private. Verified. Serious.</Text>
      <Text style={[shared.h1,{textAlign:'center'}]}>DestinyOne Executive Circle.</Text>
      <Text style={[shared.body,{textAlign:'center'}]}>Invite-only matchmaking for founders, business owners, investors and high-performing professionals who value time, privacy and real commitment.</Text>
      <View style={ventureStyles.priceSeal}><Text style={ventureStyles.priceSealText}>$5,000 / year</Text><Text style={ventureStyles.priceSealSub}>application required</Text></View>
    </View>
    <View style={ventureStyles.metricGrid}>{executiveMetrics.map(item=><MetricPill key={item.label} {...item}/>)}</View>
    <View style={ventureStyles.tabRow}>{(['overview','apply','matches','concierge'] as const).map(item=><Pressable key={item} onPress={()=>setTab(item)} style={[ventureStyles.tabButton,tab===item&&ventureStyles.tabButtonOn]}><Text style={[ventureStyles.tabText,tab===item&&{color:colors.ivory}]}>{item==='overview'?'Overview':item==='apply'?'Apply':item==='matches'?'Private matches':'Concierge'}</Text></Pressable>)}</View>
    {!!status.title&&<View style={ventureStyles.statusCard}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={34} iconSize={16}/><View style={{flex:1}}><Text style={ventureStyles.statusTitle}>{status.title}</Text><Text style={styles.helper}>{status.body}</Text></View><Pressable onPress={()=>setStatus({title:'',body:''})}><MiniPremiumIcon name="close" tone="dark" size={28} iconSize={13}/></Pressable></View>}
    {tab==='overview'&&<View style={ventureStyles.section}>
      <Text style={styles.sectionLabel}>WHAT MEMBERS GET</Text>
      <View style={coachStyles.cardGrid}>{executiveServices.map((service,index)=><View key={service.title} style={coachStyles.toolCard}><PremiumIcon name={service.icon} tone={index%2?'gold':'ruby'} size={44} iconSize={20}/><Text style={coachStyles.toolTitle}>{service.title}</Text><Text style={coachStyles.toolBody}>{service.body}</Text></View>)}</View>
      <View style={ventureStyles.actionGrid}><Button label="Apply for Executive Circle" icon="briefcase" variant="gold" onPress={()=>setTab('apply')}/><Button label="View private matches" icon="heart" variant="secondary" onPress={()=>setTab('matches')}/><Button label="Open annual pricing" icon="diamond" variant="secondary" onPress={onOpenPricing}/></View>
      <View style={coachStyles.boundaryCard}><PremiumIcon name="lock-closed" tone="gold" size={44} iconSize={19}/><View style={{flex:1}}><Text style={styles.cardTitle}>No public wealth display</Text><Text style={styles.helper}>Income, business proof and ID checks should stay private. Members only see badges like “Business verified” or “Executive approved.”</Text></View></View>
    </View>}
    {tab==='apply'&&<View style={ventureStyles.section}>
      <Text style={styles.sectionLabel}>APPLICATION REQUIREMENTS</Text>
      {executiveRequirements.map(([title,body],index)=><ChecklistRow key={title} title={title} body={body} done={index<2}/>)}
      <View style={ventureStyles.applicationCard}><Field label="Professional role" value={application.role} onChangeText={(role:string)=>{setApplicationError('');setApplication(current=>({...current,role}))}}/><Field label="City" value={application.city} onChangeText={(city:string)=>{setApplicationError('');setApplication(current=>({...current,city}))}}/><Field label="Relationship intent" value={application.intent} onChangeText={(intent:string)=>{setApplicationError('');setApplication(current=>({...current,intent}))}}/><Field label="Privacy preference" value={application.privacy} onChangeText={(privacy:string)=>{setApplicationError('');setApplication(current=>({...current,privacy}))}}/>{!!applicationError&&<View style={ventureStyles.errorCard}><MiniPremiumIcon name="alert-circle-outline" tone="ruby" size={28} iconSize={13}/><Text style={ventureStyles.errorText}>{applicationError}</Text></View>}<Button label="Submit private application" icon="send" onPress={submitApplication}/></View>
      <View style={ventureStyles.section}><Text style={styles.sectionLabel}>APPROVAL FLOW</Text>{executiveApplicationSteps.map(([title,body],index)=><ChecklistRow key={title} title={title} body={body} done={index===0}/>)}</View>
      <Button label="Complete verification first" icon="id-card" variant="secondary" onPress={onOpenVerify}/>
    </View>}
    {tab==='matches'&&<View style={ventureStyles.section}>
      <View style={shared.row}><Text style={styles.sectionLabel}>{preview?'EXECUTIVE-ONLY SAMPLE MATCHES':'EXECUTIVE-ONLY INTRODUCTIONS'}</Text><View style={shared.spacer}/><Pressable onPress={()=>setTab('apply')}><Text style={coachStyles.resultCount}>Apply</Text></Pressable></View>
      {preview?executiveMatches.map(person=><View key={person.name} style={ventureStyles.executiveMatchCard}><Image source={{uri:person.photo}} style={ventureStyles.executivePhoto}/><LinearGradient colors={['transparent','rgba(10,0,3,.96)']} style={StyleSheet.absoluteFill}/><View style={ventureStyles.executiveMatchInfo}><Chip label="Executive approved" gold/><Text style={ventureStyles.executiveName}>{person.name}, {person.age}</Text><Text style={styles.matchMeta}>{person.role} · {person.city}</Text><Text style={styles.helper}>{person.intent} · {person.vibe}</Text><View style={styles.chipRow}><Pressable onPress={()=>requestIntro(person.name)} style={coachStyles.rsvpButton}><Text style={coachStyles.rsvpText}>Request intro</Text></Pressable><Pressable onPress={onOpenDatePlan} style={coachStyles.detailsButton}><Text style={coachStyles.detailsText}>VIP date</Text></Pressable><Pressable onPress={()=>sendGift(person.name)} style={coachStyles.detailsButton}><Text style={coachStyles.detailsText}>Gift</Text></Pressable></View></View></View>):<View style={[shared.card,{gap:12,alignItems:'center'}]}><PremiumIcon name="shield-checkmark" tone="gold" size={54} iconSize={25}/><Text style={styles.cardTitle}>Approved private feed required</Text><Text style={[styles.helper,{textAlign:'center'}]}>No sample executives are shown in a live account. Approved introductions will appear only after membership, verification and concierge review are confirmed by the server.</Text></View>}
      <Button label="Talk to concierge" icon="person" onPress={()=>setTab('concierge')}/>
    </View>}
    {tab==='concierge'&&<View style={ventureStyles.section}>
      <View style={ventureStyles.conciergeCard}><PremiumIcon name="person" tone="gold" size={64} iconSize={28}/><Text style={launchStyles.scriptHero}>Your private matchmaker</Text><Text style={[shared.h2,{textAlign:'center'}]}>Tell us what kind of introduction feels right.</Text><TextInput value={conciergeNote} onChangeText={text=>{setConciergeError('');setConciergeNote(text)}} multiline placeholder="Write concierge request..." placeholderTextColor="#6F6875" style={supportStyles.messageBox}/><Text style={ventureStyles.charCount}>{conciergeNote.trim().length}/20 minimum</Text>{!!conciergeError&&<View style={ventureStyles.errorCard}><MiniPremiumIcon name="alert-circle-outline" tone="ruby" size={28} iconSize={13}/><Text style={ventureStyles.errorText}>{conciergeError}</Text></View>}<Button label="Send to concierge" icon="send" onPress={askConcierge}/></View>
      <Button label="Book private event / dinner" icon="calendar" variant="secondary" onPress={onOpenEvents}/>
      <Button label="Plan a VIP date" icon="restaurant" variant="secondary" onPress={onOpenDatePlan}/>
      <Button label="Upgrade to Executive annual" icon="diamond" variant="gold" onPress={onOpenPricing}/>
    </View>}
  </ScrollView><BottomNav active="executive" navigate={navigate}/></SafeAreaView></LinearGradient>
}

function MetricPill({label,value,icon}:{label:string;value:string;icon:keyof typeof Ionicons.glyphMap}){
  return <View style={ventureStyles.metricCard}><PremiumIcon name={icon} tone="gold" size={42} iconSize={19}/><Text style={ventureStyles.metricLabel}>{label}</Text><Text style={ventureStyles.metricValue}>{value}</Text></View>
}

function ChecklistRow({title,body,done}:{title:string;body:string;done:boolean}){
  return <View style={ventureStyles.checklistRow}><MiniPremiumIcon name={done?'checkmark-circle':'ellipse-outline'} tone={done?'gold':'dark'} size={34} iconSize={16}/><View style={{flex:1}}><Text style={ventureStyles.checkTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View></View>
}

function VerificationHub({verified,selfieUri,hasVoiceIntro,vouches,onBack,onVerify,onOpenSafety}:{verified:boolean;selfieUri:string;hasVoiceIntro:boolean;vouches:string[];onBack:()=>void;onVerify:()=>void;onOpenSafety:()=>void}){
  const preview=memberDataRuntime.source==='preview';
  const [biometricConsent,setBiometricConsent]=useState(false);
  const [idStatus,setIdStatus]=useState<'not_started'|'submitted'|'verified'>('not_started');
  const [businessStatus,setBusinessStatus]=useState<'not_started'|'submitted'|'verified'>('not_started');
  const [sessionStatus,setSessionStatus]=useState(preview?'Preview device · session controls ready for backend.':'Secure device status unavailable until session sync is connected.');
  const [trustStatus,setTrustStatus]=useState(preview?'Trust Engine preview is ready. Connect providers later for real checks.':'Verification results appear only after a secure provider and server acknowledgement.');
  const idVerified=idStatus==='verified';
  const businessVerified=businessStatus==='verified';
  const trustScore=(verified?25:8)+(selfieUri||verified?15:0)+(hasVoiceIntro?12:0)+Math.min(vouches.length,3)*10+(idVerified?18:idStatus==='submitted'?9:0)+(businessVerified?12:businessStatus==='submitted'?6:0)+(biometricConsent?8:0)+10;
  const steps=[
    {title:'Phone / email login',body:'OTP demo is available now; production connects Supabase/Twilio style phone OTP.',done:true,icon:'phone-portrait' as const},
    {title:'Biometric consent',body:biometricConsent?'Consent recorded for liveness provider handoff.':'Required before any selfie/liveness vendor runs in production.',done:biometricConsent,icon:'finger-print' as const},
    {title:'Selfie liveness',body:selfieUri||verified?'Selfie/liveness preview completed.':'Add camera or gallery selfie for trust badge.',done:!!selfieUri||verified,icon:'camera' as const},
    {title:'Optional ID check',body:idVerified?'ID provider review marked verified.':idStatus==='submitted'?'ID provider packet prepared for review.':'Production provider can verify ID without showing documents to other members.',done:idVerified,icon:'id-card' as const},
    {title:'Voice intro',body:hasVoiceIntro?'Voice intro improves authenticity.':'Add a short intro so matches can hear your vibe.',done:hasVoiceIntro,icon:'mic' as const},
    {title:'Friend vouches',body:`${vouches.length}/3 character vouches added.`,done:vouches.length>0,icon:'people' as const},
    {title:'Business verification',body:businessVerified?'Executive/business proof marked verified.':businessStatus==='submitted'?'Business review packet prepared.':'Required for Executive Circle before billing.',done:businessVerified,icon:'briefcase' as const},
  ];
  const memberBadges=[
    {title:'Verified Member',body:'Shown after phone/email + selfie check.',icon:'shield-checkmark' as const,done:verified},
    {title:'ID Checked',body:'Optional badge after private ID provider approval.',icon:'id-card' as const,done:idVerified},
    {title:'Executive Ready',body:'Business verification for $5,000/year circle.',icon:'briefcase' as const,done:businessVerified},
    {title:'Voice Intro',body:'Signals authenticity without exposing private data.',icon:'mic' as const,done:hasVoiceIntro},
    {title:'Trusted Circle',body:'Friend vouches add confidence for serious matches.',icon:'people' as const,done:vouches.length>0},
  ];
  const requirePreview=(action:()=>void)=>{if(preview){action();return}setTrustStatus('Secure provider connection required. No verification, consent, or trusted-device result was changed.')};
  const runLiveness=()=>requirePreview(()=>{if(!biometricConsent){setTrustStatus('Please accept biometric consent before liveness verification.');return}onVerify();setTrustStatus('Selfie/liveness preview completed. Production will call a liveness provider here.')});
  const advanceId=()=>requirePreview(()=>{if(idStatus==='not_started'){setIdStatus('submitted');setTrustStatus('ID review packet prepared. Production will upload encrypted documents to the provider.');return}setIdStatus('verified');setTrustStatus('ID check marked verified in preview. Public profile only shows a simple badge.')});
  const advanceBusiness=()=>requirePreview(()=>{if(businessStatus==='not_started'){setBusinessStatus('submitted');setTrustStatus('Business verification packet prepared for Executive Circle review.');return}setBusinessStatus('verified');setTrustStatus('Business verification marked approved. Executive Circle can unlock after real review.')});
  const refreshSession=()=>requirePreview(()=>{setSessionStatus(`Preview device refreshed · ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`);setTrustStatus('Session/device preview refreshed. Backend will store trusted devices and revoke controls.')});
  const providerChecklist=[
    ['Auth provider','Phone/email OTP, resend limits, device/session logs.',true],
    ['Liveness vendor','Biometric consent, selfie capture, duplicate-face checks.',biometricConsent],
    ['ID provider','Encrypted document upload, age gate, manual review fallback.',idStatus!=='not_started'],
    ['Business proof','LinkedIn/company docs, concierge review and approval logs.',businessStatus!=='not_started'],
    ['Fraud rules','Duplicate accounts, money requests, velocity and off-app pressure alerts.',true],
  ] as const;
  return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}><SafeAreaView style={shared.safe}><View style={coachStyles.header}><Pressable onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable><Text style={[styles.cardTitle,{marginLeft:12}]}>Verification & Trust Hub</Text></View><ScrollView contentContainerStyle={coachStyles.content} showsVerticalScrollIndicator={false}>
    <View style={ventureStyles.hero}><PremiumIcon name="shield-checkmark" tone="gold" size={70} iconSize={32}/><Text style={launchStyles.scriptHero}>Trust should feel calm</Text><Text style={[shared.h1,{textAlign:'center'}]}>{verified?'Verified member':'Build your trust profile'}</Text><Text style={[shared.body,{textAlign:'center'}]}>A serious dating app needs proof, privacy and safety — without making onboarding feel scary.</Text></View>
    <View style={ventureStyles.trustMeter}><View style={shared.row}><View><Text style={styles.kicker}>TRUST LEVEL</Text><Text style={ventureStyles.trustScore}>{Math.min(100,trustScore)}%</Text></View><View style={shared.spacer}/><PremiumIcon name={verified?'shield-checkmark':'shield-outline'} tone="gold" size={54} iconSize={25}/></View><View style={ventureStyles.progressTrack}><View style={[ventureStyles.progressFill,{width:`${Math.min(100,trustScore)}%`}]}/></View><Text style={styles.helper}>Internal trust signal only. Members see badges, not private scores.</Text></View>
    <View style={trustHubStyles.badgeGrid}>{memberBadges.map(badge=><View key={badge.title} style={[trustHubStyles.badgeCard,badge.done&&trustHubStyles.badgeCardOn]}><MiniPremiumIcon name={badge.done?'checkmark-circle':badge.icon} tone={badge.done?'gold':'dark'} size={34} iconSize={16}/><Text style={trustHubStyles.badgeTitle}>{badge.title}</Text><Text style={trustHubStyles.badgeBody}>{badge.body}</Text></View>)}</View>
    <View style={trustHubStyles.statusCard}><MiniPremiumIcon name="sparkles" tone="gold" size={30} iconSize={14}/><Text style={trustHubStyles.statusText}>{trustStatus}</Text></View>
    <Pressable onPress={()=>requirePreview(()=>{setBiometricConsent(value=>!value);setTrustStatus(!biometricConsent?'Biometric consent accepted for provider handoff.':'Biometric consent removed in preview.')})} style={[trustHubStyles.consentCard,biometricConsent&&trustHubStyles.consentCardOn]}><PremiumIcon name="finger-print" tone={biometricConsent?'gold':'ruby'} size={46} iconSize={21}/><View style={{flex:1}}><Text style={styles.cardTitle}>Biometric consent</Text><Text style={styles.helper}>{preview?'Required before selfie/liveness checks. Consent is separate from public profile badges.':'Consent can be recorded only through the secure liveness provider flow.'}</Text></View><View style={[discoveryStyles.switch,biometricConsent&&discoveryStyles.switchOn]}><View style={[discoveryStyles.switchThumb,biometricConsent&&discoveryStyles.switchThumbOn]}/></View></Pressable>
    <View style={trustHubStyles.actionGrid}>
      <TrustAction icon="camera" title={preview?'Run liveness preview':'Selfie liveness'} body={preview?'Completes the selfie/liveness step after consent.':'Requires the connected liveness provider and server review.'} cta={preview?(verified?'Refresh':'Run'):'Unavailable'} onPress={runLiveness}/>
      <TrustAction icon="id-card" title="ID provider packet" body={idStatus==='not_started'?'Prepare encrypted ID review handoff.':idVerified?'Verified in preview.':'Ready for reviewer approval.'} cta={idStatus==='not_started'?'Prepare':idVerified?'Verified':'Mark verified'} onPress={advanceId}/>
      <TrustAction icon="briefcase" title="Business proof" body={businessStatus==='not_started'?'Prepare Executive Circle proof review.':businessVerified?'Executive proof approved.':'Ready for concierge review.'} cta={businessStatus==='not_started'?'Prepare':businessVerified?'Approved':'Approve'} onPress={advanceBusiness}/>
      <TrustAction icon="phone-portrait" title="Device/session" body={sessionStatus} cta={preview?'Refresh':'Unavailable'} onPress={refreshSession}/>
    </View>
    <View style={trustHubStyles.privacyPanel}><PremiumIcon name="eye-off-outline" tone="gold" size={46} iconSize={21}/><View style={{flex:1}}><Text style={styles.cardTitle}>What stays private</Text><Text style={styles.helper}>ID documents, selfie source files, exact trust score, reports, blocks and safety notes are never shown on public profiles.</Text></View></View>
    <View style={ventureStyles.section}>{steps.map(step=><TrustStep key={step.title} {...step}/>)}</View>
    <View style={coachStyles.boundaryCard}><PremiumIcon name="lock-closed" tone="gold" size={44} iconSize={19}/><View style={{flex:1}}><Text style={styles.cardTitle}>Privacy promise</Text><Text style={styles.helper}>Verification photos, ID details and safety reports stay private. Public profile only shows simple trust badges.</Text></View></View>
    <View style={ventureStyles.section}><Text style={styles.sectionLabel}>PROVIDER READINESS</Text>{providerChecklist.map(([title,body,done])=><ChecklistRow key={title} title={title} body={body} done={done}/>)}</View>
    <View style={ventureStyles.section}><Text style={styles.sectionLabel}>SECURITY FEATURES TO SHIP</Text>{['End-to-end sensitive media rules','Screenshot and abuse reporting hooks','Device/session management','Data export and delete account flow','Blocked-member graph across discovery, likes and chat'].map(item=><ChecklistRow key={item} title={item} body="Backend-ready requirement for production release." done={item.includes('delete')||item.includes('Device')}/>)}</View>
    <Button label="Open Safety Center" variant="secondary" icon="shield-checkmark-outline" onPress={onOpenSafety}/>
  </ScrollView></SafeAreaView></LinearGradient>
}

function TrustAction({icon,title,body,cta,onPress}:{icon:keyof typeof Ionicons.glyphMap;title:string;body:string;cta:string;onPress:()=>void}){
  return <View style={trustHubStyles.actionCard}><PremiumIcon name={icon} tone="gold" size={42} iconSize={19}/><View style={{flex:1}}><Text style={trustHubStyles.actionTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View><Pressable onPress={onPress} style={trustHubStyles.actionButton}><Text style={trustHubStyles.actionButtonText}>{cta}</Text></Pressable></View>
}

function TrustStep({title,body,done,icon}:{title:string;body:string;done:boolean;icon:keyof typeof Ionicons.glyphMap}){
  return <View style={ventureStyles.trustStep}><PremiumIcon name={icon} tone={done?'gold':'ruby'} size={42} iconSize={19}/><View style={{flex:1}}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View><MiniPremiumIcon name={done?'checkmark-circle':'ellipse-outline'} tone={done?'gold':'dark'} size={34} iconSize={16}/></View>
}

function AdminModerationPanel({reports,blockedCount,onBack}:{reports:LocalReport[];blockedCount:number;onBack:()=>void}){
  const [tab,setTab]=useState<'queue'|'reports'|'playbooks'|'audit'>('queue');
  const [caseStatus,setCaseStatus]=useState<Record<string,ModerationStatus>>({});
  const [opsNote,setOpsNote]=useState('Preview actions update local case status only. Hosted reviewer access and drills are not yet verified.');
  const queue=buildModerationQueue(reports,blockedCount).map(item=>({...item,status:caseStatus[item.id]??item.status}));
  const summary=summarizeModerationQueue(queue);
  const dataSnapshot=getLaunchReadinessSnapshot(productionDataModules);
  const trustOpsSnapshot=buildTrustOpsSnapshot({
    queue,
    reportCount:reports.length,
    blockedCount,
    reviewerCount:3,
    supportCoverageHours:16,
    targetSlaHours:summary.highOrCritical?Math.min(6,summary.fastestSlaHours||6):12,
    escalationOwnerReady:true,
    emergencyPlaybookReady:true,
    evidenceRetentionReady:true,
    blockAuditReady:true,
    reportBlockFlowReady:true,
    appealPathReady:true,
    supportContactReady:true,
    reviewerRbacReady:false,
    dualReviewReady:false,
    incidentDrillPassed:false,
  });
  const backendLaunchSnapshot=buildBackendLaunchSnapshot({
    backendMode,
    appEnvironment,
    requiresRealBackend,
    supabaseConfigured:isSupabaseConfigured,
    migrationCount:31,
    edgeFunctionCount:5,
    dataModuleCount:dataSnapshot.totalModules,
    backendReadyModuleCount:dataSnapshot.backendReadyModules,
    realtimeModuleCount:dataSnapshot.realtimeModules,
    providerModuleCount:dataSnapshot.providerModules,
    authAdapterReady:true,
    emailOtpReady:backendMode==='supabase',
    phoneOtpProviderReady:false,
    databaseTypesReady:true,
    hostedSchemaVerified:false,
    migrationHistoryAligned:false,
    databaseTestsPassed:false,
    rlsPoliciesReady:true,
    storageBucketsReady:true,
    realtimePersistenceReady:true,
    edgeFunctionsReady:true,
    serverSecretsReady:false,
    productionEnvLocked:appEnvironment==='production'&&requiresRealBackend,
    backupMonitoringReady:false,
  });
  const paymentEntitlementSnapshot=buildPaymentEntitlementSnapshot({
    billingMode:'preview',
    appEnvironment,
    paymentsConfigured,
    membershipPlanCount:membershipPlans.length,
    sparkPackCount:sparkPacks.length,
    hasExecutivePlan:!!executivePlan,
    checkoutPreviewReady:true,
    storeProductIdsReady:false,
    receiptVerificationReady:false,
    restorePurchaseReady:true,
    entitlementLedgerReady:true,
    featureLimitsReady:false,
    subscriptionCopyReady:true,
    appleGoogleDisclosureReady:true,
    stripeReservationReady:paymentsConfigured,
    webhookReconciliationReady:false,
    refundSupportReady:true,
    abuseControlsReady:true,
    productionBillingLocked:false,
  });
  const monetizationOperationsSnapshot=buildMonetizationOperationsSnapshot({
    environment:appEnvironment,
    liveReceiptCount:0,
    verifiedReceiptCount:0,
    activeEntitlementCount:0,
    unresolvedRefundCount:0,
    unresolvedChargebackCount:0,
    appleProviderConnected:false,
    googleProviderConnected:false,
    realWorldProcessorConnected:false,
    webhookSignatureVerificationReady:true,
    immutableLedgerReady:true,
    restoreReady:true,
    gracePeriodReady:true,
    refundWorkflowReady:true,
    taxConfigurationReady:false,
    fraudReviewReady:true,
    financeReconciliationReady:false,
    catalogVerificationReady:true,
    renewalOwnershipReady:true,
    restoreSessionReady:true,
    boundedReversalReady:true,
    refundAuditReady:true,
    financeProvenanceReady:true,
    protectedFreeCapabilitiesReady:true,
    unitEconomics:{grossRevenueCents:0,storeAndProcessorFeesCents:0,taxesCents:0,refundsCents:0,chargebacksCents:0,marketplaceCostCents:0,supportCostCents:0,acquisitionCostCents:0},
  });
  const pilotReadinessSnapshot=buildPilotReadinessSnapshot({
    pilotCity:'Toronto',
    hostedBackendVerified:false,
    authDeliveryVerified:false,
    securityTestsExecuted:false,
    iosDeviceJourneyPassed:false,
    androidDeviceJourneyPassed:false,
    trustOpsStaffed:false,
    incidentDrillPassed:false,
    liquidityWeeksVerified:0,
    requiredLiquidityWeeks:8,
    providerSandboxVerified:false,
    observabilityAlertDrillPassed:false,
    publicLegalUrlsVerified:false,
    rollbackDrillPassed:false,
  });
  const notificationSnapshot=buildNotificationReadinessSnapshot({
    appEnvironment,
    backendConnected:backendMode==='supabase',
    notificationTableReady:true,
    pushTokenStorageReady:true,
    realtimeNotificationsReady:true,
    profileViewThresholdReady:true,
    matchTriggersReady:true,
    sparkAlertsReady:true,
    giftTrackingReady:true,
    dateReminderReady:true,
    safetyAlertsReady:true,
    supportAlertsReady:true,
    memberPreferencesReady:true,
    quietHoursReady:true,
    deepLinkRoutesReady:false,
    pushProviderConfigured:false,
    serverPushSecretsReady:false,
    rateLimitsReady:true,
    physicalDeviceTested:false,
  });
  const giftFulfillmentSnapshot=buildGiftFulfillmentReadinessSnapshot({
    appEnvironment,
    giftOrderingConfigured,
    catalogItemCount:physicalGifts.length,
    cityCoverageCount:5,
    signedPartnerCount:0,
    hasServerOwnedPricing:true,
    hasRecipientConsentFlow:true,
    hasPrivateAddressHandling:true,
    hasProviderApi:giftOrderingConfigured,
    hasCourierTracking:giftOrderingConfigured,
    hasWebhookReconciliation:false,
    hasPaymentAuthorization:paymentsConfigured,
    hasRefundPolicy:true,
    hasSupportSla:trustOpsSnapshot.status==='Ready for staffed pilot',
    hasAbuseLimits:true,
    hasGiftNotificationFlow:true,
    hasPhysicalDeviceQa:false,
    productionLocked:appEnvironment==='production'&&giftOrderingConfigured&&paymentsConfigured,
  });
  const placesReservationSnapshot=buildPlacesReservationReadinessSnapshot({
    appEnvironment,
    venueCount:placeDirectory.length,
    cityCount:placeCities.filter(city=>city!=='All').length,
    categoryCount:placeKinds.filter(kind=>kind!=='All').length,
    packageCount:datePackages.length,
    partnerLeadCount:launchMarketplaceCoverage.reduce((sum,city)=>sum+city.partnerLeads,0),
    signedPartnerCount:launchMarketplaceCoverage.reduce((sum,city)=>sum+city.signedPartners,0),
    hasSearch:true,
    hasSafeFirstDateFilter:true,
    hasLocationConsent:true,
    hasSafetyCheckIns:true,
    livePlacesProviderConnected:false,
    hasHoursRatingsMaps:false,
    reservationProviderConnected:false,
    reservationHoldFlowReady:true,
    availabilitySyncReady:false,
    paymentWebhookConnected:paymentsConfigured,
    refundPolicyReady:false,
    supportSlaHours:48,
    safetyStaffingReady:false,
    deepLinkRoutesReady:false,
    physicalDeviceQaReady:false,
    productionLocked:appEnvironment==='production'&&paymentsConfigured,
  });
  const observabilitySnapshot=buildObservabilityReadinessSnapshot({
    appEnvironment,
    telemetryAdapterReady:true,
    privacySafeEventBuilderReady:true,
    sensitiveMetadataRedactionReady:true,
    allowedEventCount:8,
    criticalEventCount:8,
    consentControlsReady:true,
    analyticsOptOutReady:true,
    dataRetentionPolicyReady:true,
    dataSafetyDisclosureReady:true,
    crashBoundaryReady:true,
    crashProviderConfigured:false,
    performanceMonitoringReady:false,
    dashboardReady:false,
    providerSecretsServerSide:false,
    alertOwnerReady:false,
    alertSlaMinutes:60,
    physicalDeviceQaReady:false,
    productionLocked:appEnvironment==='production'&&requiresRealBackend,
  });
  const abuseFraudSnapshot=buildAbuseFraudReadinessSnapshot({
    appEnvironment,
    romanceScamRulesReady:true,
    moneyOffAppLocationRulesReady:true,
    messageSafetyScannerReady:true,
    reportBlockFlowReady:true,
    blockGraphReady:true,
    giftPaymentVelocityLimitsReady:true,
    roseSparkDailyLimitsReady:true,
    refundDisputeReviewReady:true,
    profileReverificationReady:true,
    trustedVouchReady:true,
    duplicateAccountRulesReady:true,
    deviceRiskProviderConnected:false,
    captchaRiskProviderConnected:false,
    adminFreezeActionsReady:true,
    evidenceAuditReady:true,
    appealSupportReady:true,
    safetyEducationReady:true,
    physicalDeviceQaReady:false,
    productionLocked:appEnvironment==='production'&&requiresRealBackend,
  });
  const visibleQueue=tab==='queue'?queue:queue.filter(item=>item.humanReviewRequired);
  const qualitySnapshot=buildProductQualitySnapshot({
    hasBottomNavScreens:['home','discovery','coach','executive','likes','chat','profile'],
    hasSafetyActions:true,
    hasSupportFlow:true,
    hasPricingFlow:true,
    hasResponsiveShell:true,
    hasBackendConnected:backendMode==='supabase',
  });
  const interactionSnapshot=buildInteractionAuditSnapshot();
  const policyComplianceSnapshot=buildPolicyComplianceSnapshot({
    hasReportFlow:true,
    hasBlockFlow:true,
    hasModerationQueue:true,
    hasCommunityGuidelines:true,
    hasAgeGate:true,
    hasAccountDeletion:true,
    hasPrivacyPolicy:true,
    hasDataSafetyDisclosure:true,
    hasSubscriptionDisclosure:true,
    hasLocationConsent:true,
    hasGiftRecipientConsent:true,
    hasSafetyCheckIns:true,
  });
  const storeReviewSnapshot=buildStoreReviewSnapshot({
    appEnvironment,
    backendMode,
    demoOtpFallbackAllowed:allowsPreviewOtpFallback,
    reviewerAccessConfigured:false,
    supportContactConfigured:false,
    legalUrlsPublished:false,
  });
  const storeReviewReady=(id:string)=>storeReviewSnapshot.items.find(item=>item.id===id)?.ready??false;
  const legalOpsSnapshot=buildLegalStoreOpsSnapshot({
    privacyPolicyDrafted:true,
    termsDrafted:true,
    communityGuidelinesDrafted:true,
    companyDetailsFinal:false,
    legalReviewComplete:false,
    privacyUrlPublished:false,
    termsUrlPublished:false,
    supportUrlPublished:false,
    dataSafetyDrafted:true,
    appStorePrivacyLabelsReady:false,
    playDataSafetyReady:true,
    ageRatingReady:false,
    subscriptionDisclosureReady:true,
    accountDeletionReady:true,
    reviewerAccessReady:storeReviewReady('reviewer_credentials')&&storeReviewReady('review_notes'),
    productionDemoGuardReady:storeReviewReady('production_demo_guard'),
    supportContactReady:true,
  });
  const releaseSnapshot=buildReleaseReadinessSnapshot({
    backendConnected:backendMode==='supabase',
    paymentsConnected:paymentsConfigured,
    giftProviderConnected:giftOrderingConfigured,
    placesProviderConnected:false,
    pushNotificationsConnected:false,
    observabilityConnected:observabilitySnapshot.status==='Ready for monitored launch',
    hasStoreAssets:true,
    hasStoreListing:true,
    hasStoreReviewAccess:storeReviewReady('reviewer_credentials')&&storeReviewReady('review_notes'),
    hasProductionDemoGuard:storeReviewReady('production_demo_guard'),
    hasPrivacyPolicy:true,
    hasTerms:true,
    hasCommunityGuidelines:true,
    hasPolicyCompliance:policyComplianceSnapshot.blockers.length===0,
    hasDataSafety:true,
    hasAgeGate:true,
    hasDataDeletion:true,
    hasSafetyOperations:true,
    hasAbuseFraudProtection:abuseFraudSnapshot.status!=='Abuse setup needed',
    hasProductQA:qualitySnapshot.blockers.length===0,
    hasInteractionQA:interactionSnapshot.criticalMissing.length===0,
  });
  const marketplaceSnapshot=buildMarketplaceSnapshot();
  const networkSnapshot=buildNetworkEffectPlan({matches,selectedCities:[],verified:true,vouchesCount:3});
  const cityDensitySnapshot=buildCityDensitySnapshot({
    liveMetricsConnected:false,
    measurements:[],
    metricIngestionReady:true,
    privacySuppressionReady:true,
    discoveryEnforcementReady:true,
    dualApprovalReady:true,
    rollbackReady:true,
  });
  const growthEngineSnapshot=buildGrowthEngineSnapshot({
    liveInstrumentationConnected:false,
    mappedEvents:growthFunnelEvents.length,
    liveEventCount:0,
    attributionConnected:false,
    experimentRegistryConnected:false,
    cohortDashboardConnected:false,
    referralVerificationConnected:false,
    activeExperiments:0,
    verifiedConversions:0,
    serverVerifiedOutcomesReady:true,
    campaignGovernanceReady:true,
    experimentSafetyControlsReady:true,
    referralRiskLedgerReady:true,
    consentWithdrawalReady:true,
    cohortProvenanceReady:true,
  });
  const p1Snapshot=buildP1OperationsSnapshot({
    hasDateMarketplacePreview:marketplaceSnapshot.ready,
    hasLiveVenueProvider:false,
    hasReservationProvider:false,
    launchCityCount:networkSnapshot.launchCities.length,
    hasWaitlistModel:true,
    hasReferralRewards:true,
    hasAmbassadorModel:true,
    hasIndianEvents:eventExperiences.length>=3,
    hasAlumniGroups:true,
    hasSuccessStoriesModel:true,
    hasTrustOpsQueue:true,
    hasSupportSla:trustOpsSnapshot.status==='Ready for staffed pilot',
    hasLegalDrafts:legalOpsSnapshot.gates.some(gate=>gate.id==='legal_documents'&&gate.started),
    legalUrlsPublished:legalOpsSnapshot.gates.some(gate=>gate.id==='public_urls'&&gate.ready),
  });
  const updateCase=(item:ModerationQueueItem,status:ModerationStatus,note:string)=>{
    setCaseStatus(current=>({...current,[item.id]:status}));
    setOpsNote(`${item.member}: ${note}`);
  };
  const automationGuards=[
    ['Money scam lock','Gift, payment and chat-send limits trigger when money/crypto/gift-card risk is high.'],
    ['Profile integrity','Photo edits and verification mismatches create a trust-review case before more discovery exposure.'],
    ['Block graph','Blocked and reported members are removed across discovery, likes and chat.'],
    ['Human override','Critical actions require an audit trail and reviewer note before permanent ban.'],
    ['Appeal route','Members can contact support if a decision affects access or billing.'],
  ] as const;
  return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}><SafeAreaView style={shared.safe}><View style={coachStyles.header}><Pressable onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable><Text style={[styles.cardTitle,{marginLeft:12}]}>Trust Ops Preview</Text></View><ScrollView contentContainerStyle={coachStyles.content} showsVerticalScrollIndicator={false}>
    <View style={ventureStyles.hero}><PremiumIcon name="analytics" tone="plum" size={70} iconSize={32}/><Text style={launchStyles.scriptHero}>Safety scales with operations</Text><Text style={[shared.h1,{textAlign:'center'}]}>Moderation dashboard.</Text><Text style={[shared.body,{textAlign:'center'}]}>Reports, blocks, scam signals, trust checks and support escalations now flow into one human-review queue.</Text></View>
    <View style={adminOpsStyles.statGrid}><AdminOpsStat value={`${summary.total}`} label="open cases"/><AdminOpsStat value={`${summary.highOrCritical}`} label="high risk"/><AdminOpsStat value={`${summary.humanReview}`} label="human review"/><AdminOpsStat value={`${summary.fastestSlaHours}h`} label="fastest SLA"/></View>
    <TrustOpsSlaCard snapshot={trustOpsSnapshot}/>
    <View style={adminOpsStyles.statusCard}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={30} iconSize={14}/><Text style={adminOpsStyles.statusText}>{opsNote}</Text></View>
    <View style={adminOpsStyles.tabRow}>{(['queue','reports','playbooks','audit'] as const).map(item=><Pressable key={item} onPress={()=>setTab(item)} style={[adminOpsStyles.tab,tab===item&&adminOpsStyles.tabOn]}><Text style={[adminOpsStyles.tabText,tab===item&&{color:colors.ivory}]}>{item==='queue'?'Queue':item==='reports'?'Reports':item==='playbooks'?'Playbooks':'Audit'}</Text></Pressable>)}</View>
    {tab==='queue'&&<View style={ventureStyles.section}><Text style={styles.sectionLabel}>LIVE REVIEW QUEUE</Text>{visibleQueue.map(item=><ModerationCaseCard key={item.id} item={item} onFreeze={()=>updateCase(item,'frozen','chat/payment abilities frozen pending review')} onEscalate={()=>updateCase(item,'escalated','escalated to senior Trust Ops')} onResolve={()=>updateCase(item,'resolved','case resolved with reviewer note')} onEvidence={()=>setOpsNote(`${item.member}: evidence packet includes ${item.evidence.join(', ')}`)}/>)}</View>}
    {tab==='reports'&&<View style={ventureStyles.section}><Text style={styles.sectionLabel}>SESSION REPORTS</Text>{reports.length?reports.slice().reverse().map(report=><View key={report.id} style={adminOpsStyles.reportCard}><View style={shared.row}><MiniPremiumIcon name="flag-outline" tone="ruby" size={30} iconSize={14}/><Text style={[styles.cardTitle,{flex:1}]}>Report on {report.matchId}</Text><Text style={adminOpsStyles.timeText}>{new Date(report.createdAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</Text></View><Text style={styles.helper}>{report.reason}</Text>{!!report.details&&<Text style={adminOpsStyles.reportDetails}>{report.details}</Text>}<View style={adminOpsStyles.reportFooter}><Text style={adminOpsStyles.footerText}>Preview session copy · production reports create a private Trust Ops case automatically</Text></View></View>):<View style={adminOpsStyles.emptyCard}><PremiumIcon name="shield-checkmark" tone="gold" size={46} iconSize={21}/><Text style={styles.cardTitle}>No local reports yet</Text><Text style={styles.helper}>Use any profile/chat safety menu → Report to create a live moderation item.</Text></View>}</View>}
    {tab==='playbooks'&&<View style={ventureStyles.section}><Text style={styles.sectionLabel}>AUTOMATION GUARDS</Text>{automationGuards.map(([title,body],index)=><ChecklistRow key={title} title={title} body={body} done={index<3}/>)}
      <View style={coachStyles.boundaryCard}><PremiumIcon name="warning" tone="gold" size={44} iconSize={19}/><View style={{flex:1}}><Text style={styles.cardTitle}>Human-first safety</Text><Text style={styles.helper}>AI can prioritize and freeze risky surfaces, but permanent bans, sensitive identity decisions and billing-impact actions need human review.</Text></View></View>
    </View>}
    {tab==='audit'&&<View style={ventureStyles.section}><PilotReadinessCard snapshot={pilotReadinessSnapshot}/><BackendLaunchGateCard snapshot={backendLaunchSnapshot}/><CityDensityReadinessCard snapshot={cityDensitySnapshot}/><GrowthEngineReadinessCard snapshot={growthEngineSnapshot}/><MonetizationOperationsCard snapshot={monetizationOperationsSnapshot}/><PaymentEntitlementGateCard snapshot={paymentEntitlementSnapshot}/><NotificationReadinessCard snapshot={notificationSnapshot}/><GiftFulfillmentReadinessCard snapshot={giftFulfillmentSnapshot}/><PlacesReservationReadinessCard snapshot={placesReservationSnapshot}/><ObservabilityReadinessCard snapshot={observabilitySnapshot}/><AbuseFraudReadinessCard snapshot={abuseFraudSnapshot}/><TrustOpsSlaCard snapshot={trustOpsSnapshot}/><LegalStoreOpsCard snapshot={legalOpsSnapshot}/><P1OperationsCard snapshot={p1Snapshot}/><ProductQualityCard snapshot={qualitySnapshot}/><InteractionQualityCard snapshot={interactionSnapshot}/><PolicyComplianceCard snapshot={policyComplianceSnapshot}/><StoreReviewCard snapshot={storeReviewSnapshot}/><ReleaseReadinessCard snapshot={releaseSnapshot}/><Text style={styles.sectionLabel}>AUDIT READINESS</Text>{([
      ['Reviewer notes','Every freeze, escalation and resolution needs reviewer ID + note.'],
      ['Evidence packet','Reports, chat IDs, gift/payment events, profile edits and block graph stay linked.'],
      ['Member notification','Warnings and support outcomes are sent without exposing reporter identity.'],
      ['Appeals','Support ticket can reopen a resolved moderation case.'],
      ['Data deletion','Deletion workflow respects safety-retention holds when legally required.'],
    ] as const).map(([title,body],index)=><ChecklistRow key={title} title={title} body={body} done={index<4}/>)}</View>}
  </ScrollView></SafeAreaView></LinearGradient>
}

function AdminOpsStat({value,label}:{value:string;label:string}){
  return <View style={adminOpsStyles.stat}><Text style={adminOpsStyles.statValue}>{value}</Text><Text style={adminOpsStyles.statLabel}>{label}</Text></View>
}

function PilotReadinessCard({snapshot}:{snapshot:PilotReadinessSnapshot}){
  const ready=snapshot.status==='Ready for controlled city pilot';
  return <View style={adminOpsStyles.backendLaunchCard}>
    <View style={shared.row}><PremiumIcon name={ready?'rocket':'flag-outline'} tone={ready?'gold':'ruby'} size={54} iconSize={25}/><View style={{flex:1,marginLeft:10}}><Text style={styles.kicker}>{snapshot.pilotCity.toUpperCase()} CONTROLLED PILOT GATE</Text><Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.evidencePercent}%</Text><Text style={styles.helper}>Only hosted, staffed, device-tested and live operational evidence advances this gate.</Text></View></View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.evidencePercent}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Evidence</Text><Text style={adminOpsStyles.areaScore}>{snapshot.readyCount}/{snapshot.total}</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Devices</Text><Text style={adminOpsStyles.areaScore}>{snapshot.deviceJourneysPassed}/2</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Liquidity</Text><Text style={adminOpsStyles.areaScore}>{snapshot.liquidityWeeksVerified}/{snapshot.requiredLiquidityWeeks}w</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockers.length}</Text></View></View>
    <View style={adminOpsStyles.nextOpsCard}><MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/><Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text></View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><View key={gate.id} style={adminOpsStyles.qualityRow}><MiniPremiumIcon name={gate.ready?'checkmark-circle':'ellipse-outline'} tone={gate.ready?'gold':'ruby'} size={28} iconSize={13}/><View style={{flex:1}}><View style={shared.row}><Text style={[adminOpsStyles.qualityRowTitle,{flex:1}]}>{gate.title}</Text><Text style={adminOpsStyles.nextTiny}>{gate.owner}</Text></View><Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>{!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}</View></View>)}</View>
  </View>
}

function CityDensityReadinessCard({snapshot}:{snapshot:CityDensitySnapshot}){
  return <View style={cityDensityStyles.auditCard}>
    <View style={shared.row}><PremiumIcon name="map" tone="gold" size={48} iconSize={22}/><View style={{flex:1,marginLeft:10}}><Text style={styles.kicker}>CITY DENSITY GATE</Text><Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text><Text style={styles.helper}>Liquidity is measured by reciprocal candidates and healthy outcomes, never waitlist size alone.</Text></View></View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Source</Text><Text style={adminOpsStyles.areaScore}>{snapshot.sourceControlScore}%</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Controls</Text><Text style={adminOpsStyles.areaScore}>{snapshot.sourceControlReady}/{snapshot.sourceControlTotal}</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Expansion</Text><Text style={adminOpsStyles.areaScore}>{snapshot.readyMarkets}</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Live data</Text><Text style={adminOpsStyles.areaScore}>{snapshot.liveMetricsConnected?'Yes':'No'}</Text></View></View>
    <View style={cityDensityStyles.marketGrid}>{snapshot.markets.map(market=><View key={market.city} style={cityDensityStyles.marketCard}><View style={shared.row}><Text style={cityDensityStyles.marketName}>{market.city}</Text><Text style={cityDensityStyles.marketScore}>{market.score}%</Text></View><Text style={cityDensityStyles.marketStatus}>{market.status}</Text><Text style={cityDensityStyles.marketBody}>{market.nextAction}</Text></View>)}</View>
    <View style={adminOpsStyles.nextOpsCard}><MiniPremiumIcon name="arrow-forward-circle" tone="gold" size={30} iconSize={14}/><Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text></View>
  </View>
}

function GrowthEngineReadinessCard({snapshot}:{snapshot:GrowthEngineSnapshot}){
  return <View style={cityDensityStyles.auditCard}>
    <View style={shared.row}><PremiumIcon name="trending-up" tone="rose" size={48} iconSize={22}/><View style={{flex:1,marginLeft:10}}><Text style={styles.kicker}>GROWTH ENGINE GATE</Text><Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text><Text style={styles.helper}>Growth is measured from verified profile to retained member and accepted date, with consent and safety guardrails.</Text></View></View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Source</Text><Text style={adminOpsStyles.areaScore}>{snapshot.sourceControlScore}%</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Controls</Text><Text style={adminOpsStyles.areaScore}>{snapshot.sourceControlReady}/{snapshot.sourceControlTotal}</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Live events</Text><Text style={adminOpsStyles.areaScore}>{snapshot.liveEventCount}</Text></View><View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Conversions</Text><Text style={adminOpsStyles.areaScore}>{snapshot.verifiedConversions}</Text></View></View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.blockers.map((blocker,index)=><View key={blocker} style={adminOpsStyles.qualityRow}><MiniPremiumIcon name={index===0?'analytics-outline':'lock-closed-outline'} tone="rose" size={28} iconSize={13}/><Text style={[adminOpsStyles.qualityRowBody,{flex:1}]}>{blocker}</Text></View>)}</View>
    <View style={adminOpsStyles.nextOpsCard}><MiniPremiumIcon name="arrow-forward-circle" tone="gold" size={30} iconSize={14}/><Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text></View>
  </View>
}

function backendLaunchGateIcon(id: BackendLaunchGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<BackendLaunchGate['id'], keyof typeof Ionicons.glyphMap> = {
    client_config: 'server-outline',
    auth_providers: 'key-outline',
    schema_migrations: 'git-branch-outline',
    rls_security: 'lock-closed-outline',
    realtime_persistence: 'sync-circle-outline',
    storage_media: 'images-outline',
    edge_functions: 'flash-outline',
    secrets_environment: 'document-lock-outline',
    backup_monitoring: 'pulse-outline',
  };
  return icons[id];
}

function BackendLaunchGateCard({snapshot}:{snapshot:BackendLaunchSnapshot}){
  const ready=snapshot.status==='Ready for production backend';
  return <View style={adminOpsStyles.backendLaunchCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'cloud-done':'cloud-upload-outline'} tone={ready?'gold':'rose'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>BACKEND / SUPABASE GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} backend gates ready. Schema can be ready while OTP/SMS, server secrets and monitoring remain final launch work.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Schema</Text><Text style={adminOpsStyles.areaScore}>{snapshot.schemaCoverage}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Realtime</Text><Text style={adminOpsStyles.areaScore}>{snapshot.realtimeModules}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Providers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.providerModules}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockers.length}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><BackendLaunchGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function BackendLaunchGateRow({gate}:{gate:BackendLaunchGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':backendLaunchGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function paymentEntitlementGateIcon(id: PaymentEntitlementGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<PaymentEntitlementGate['id'], keyof typeof Ionicons.glyphMap> = {
    product_catalog: 'pricetags-outline',
    checkout_surface: 'card-outline',
    store_products: 'storefront-outline',
    receipt_verification: 'receipt-outline',
    entitlement_limits: 'key-outline',
    restore_disclosure: 'refresh-circle-outline',
    real_world_payments: 'wallet-outline',
    refund_safety_ops: 'shield-checkmark-outline',
    production_lock: 'lock-closed-outline',
  };
  return icons[id];
}

function MonetizationOperationsCard({snapshot}:{snapshot:MonetizationOperationsSnapshot}){
  const ready=snapshot.status==='Ready for controlled billing pilot';
  return <View style={adminOpsStyles.paymentEntitlementCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'cash':'analytics-outline'} tone={ready?'gold':'ruby'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>MONETIZATION OPERATIONS GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.evidencePercent}%</Text>
        <Text style={styles.helper}>Live receipts, provider reconciliation and finance evidence stay at zero until real sandbox/store transactions are verified.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.evidencePercent}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Receipts</Text><Text style={adminOpsStyles.areaScore}>{snapshot.liveReceiptCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Verified</Text><Text style={adminOpsStyles.areaScore}>{snapshot.verifiedReceiptRate}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Source</Text><Text style={adminOpsStyles.areaScore}>{snapshot.sourceControlScore}/10</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Controls</Text><Text style={adminOpsStyles.areaScore}>{snapshot.sourceControlReady}/{snapshot.sourceControlTotal}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}><MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/><Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text></View>
    <View style={adminOpsStyles.qualityRows}>
      {['Verified store catalog + renewal ownership','Signed retryable webhooks + bounded reversal','Restore sessions + immutable entitlement ledger','Qualified refund audit + finance provenance','Safety, report, block and privacy remain free'].map(item=><View key={item} style={adminOpsStyles.qualityRow}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={28} iconSize={13}/><View style={{flex:1}}><Text style={adminOpsStyles.qualityRowTitle}>{item}</Text><Text style={adminOpsStyles.qualityRowBody}>Source control implemented; live provider and finance evidence is still required.</Text></View></View>)}
    </View>
  </View>
}

function PaymentEntitlementGateCard({snapshot}:{snapshot:PaymentEntitlementSnapshot}){
  const ready=snapshot.status==='Ready for paid launch';
  return <View style={adminOpsStyles.paymentEntitlementCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'card':'card-outline'} tone={ready?'gold':'ruby'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>PAYMENTS / ENTITLEMENTS GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} billing gates ready. Paid UI can be preview-ready while App Store products, receipts and webhooks remain final launch work.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Products</Text><Text style={adminOpsStyles.areaScore}>{snapshot.paidProductCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Ready</Text><Text style={adminOpsStyles.areaScore}>{snapshot.readyCount}/{snapshot.total}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockerCount}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><PaymentEntitlementGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function PaymentEntitlementGateRow({gate}:{gate:PaymentEntitlementGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':paymentEntitlementGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function notificationGateIcon(id: NotificationGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<NotificationGate['id'], keyof typeof Ionicons.glyphMap> = {
    schema_tokens: 'server-outline',
    permission_preferences: 'options-outline',
    event_triggers: 'flash-outline',
    push_provider: 'notifications-outline',
    deep_links: 'link-outline',
    rate_limits: 'timer-outline',
    safety_support_alerts: 'shield-checkmark-outline',
    production_qa: 'phone-portrait-outline',
  };
  return icons[id];
}

function NotificationReadinessCard({snapshot}:{snapshot:NotificationReadinessSnapshot}){
  const ready=snapshot.status==='Ready for notification launch';
  return <View style={adminOpsStyles.notificationCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'notifications':'notifications-outline'} tone={ready?'gold':'rose'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>NOTIFICATIONS / ALERTS GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} notification gates ready. Push provider and physical-device QA stay final launch work until real credentials are connected.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Events</Text><Text style={adminOpsStyles.areaScore}>{snapshot.eventCoverage}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Ready</Text><Text style={adminOpsStyles.areaScore}>{snapshot.readyCount}/{snapshot.total}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockerCount}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><NotificationGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function NotificationGateRow({gate}:{gate:NotificationGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':notificationGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function giftFulfillmentGateIcon(id: GiftFulfillmentGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<GiftFulfillmentGate['id'], keyof typeof Ionicons.glyphMap> = {
    catalog_pricing: 'pricetags-outline',
    recipient_consent: 'hand-left-outline',
    provider_coverage: 'storefront-outline',
    payment_capture: 'card-outline',
    order_tracking: 'bicycle-outline',
    privacy_safety: 'lock-closed-outline',
    support_refunds: 'headset-outline',
    production_qa: 'phone-portrait-outline',
  };
  return icons[id];
}

function GiftFulfillmentReadinessCard({snapshot}:{snapshot:GiftFulfillmentReadinessSnapshot}){
  const ready=snapshot.status==='Ready for live gift orders';
  return <View style={adminOpsStyles.giftFulfillmentCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'gift':'gift-outline'} tone={ready?'gold':'rose'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>GIFT FULFILLMENT GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} gift operations ready. Catalog and private-recipient preview can be ready while delivery partners, webhooks and live QA remain final launch work.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Catalog</Text><Text style={adminOpsStyles.areaScore}>{snapshot.catalogItemCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Coverage</Text><Text style={adminOpsStyles.areaScore}>{snapshot.providerCoverage}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockerCount}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><GiftFulfillmentGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function GiftFulfillmentGateRow({gate}:{gate:GiftFulfillmentGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':giftFulfillmentGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function placesReservationGateIcon(id: PlacesReservationGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<PlacesReservationGate['id'], keyof typeof Ionicons.glyphMap> = {
    curated_inventory: 'map-outline',
    places_provider: 'business-outline',
    reservation_provider: 'calendar-outline',
    packages_partners: 'restaurant-outline',
    safety_location: 'shield-checkmark-outline',
    payments_refunds: 'card-outline',
    support_operations: 'headset-outline',
    production_qa: 'phone-portrait-outline',
  };
  return icons[id];
}

function PlacesReservationReadinessCard({snapshot}:{snapshot:PlacesReservationReadinessSnapshot}){
  const ready=snapshot.status==='Ready for live reservations';
  return <View style={adminOpsStyles.placesReservationCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'calendar':'calendar-outline'} tone={ready?'gold':'rose'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>PLACES / RESERVATION GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} venue gates ready. Curated places can be preview-ready while live hours, reservations, refunds and provider QA remain final launch work.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Venues</Text><Text style={adminOpsStyles.areaScore}>{snapshot.venueCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Cities</Text><Text style={adminOpsStyles.areaScore}>{snapshot.cityCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Partners</Text><Text style={adminOpsStyles.areaScore}>{snapshot.partnerCoverage}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockerCount}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><PlacesReservationGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function PlacesReservationGateRow({gate}:{gate:PlacesReservationGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':placesReservationGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function observabilityGateIcon(id: ObservabilityGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<ObservabilityGate['id'], keyof typeof Ionicons.glyphMap> = {
    privacy_boundary: 'shield-checkmark-outline',
    event_taxonomy: 'list-outline',
    consent_retention: 'options-outline',
    crash_capture: 'bug-outline',
    performance_monitoring: 'speedometer-outline',
    provider_security: 'key-outline',
    alerting_ownership: 'alarm-outline',
    production_qa: 'phone-portrait-outline',
  };
  return icons[id];
}

function ObservabilityReadinessCard({snapshot}:{snapshot:ObservabilityReadinessSnapshot}){
  const ready=snapshot.status==='Ready for monitored launch';
  return <View style={adminOpsStyles.observabilityCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'pulse':'pulse-outline'} tone={ready?'gold':'plum'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>OBSERVABILITY / PRIVACY GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} monitoring gates ready. Analytics and crash providers stay final launch work, but event payloads must remain privacy-safe now.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Events</Text><Text style={adminOpsStyles.areaScore}>{snapshot.eventCoverage}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Ready</Text><Text style={adminOpsStyles.areaScore}>{snapshot.readyCount}/{snapshot.total}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockerCount}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><ObservabilityGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function ObservabilityGateRow({gate}:{gate:ObservabilityGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':observabilityGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function abuseFraudGateIcon(id: AbuseFraudGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<AbuseFraudGate['id'], keyof typeof Ionicons.glyphMap> = {
    romance_scam_rules: 'warning-outline',
    message_safety_scanner: 'chatbubble-ellipses-outline',
    report_block_graph: 'ban-outline',
    paid_action_abuse: 'card-outline',
    account_integrity: 'person-circle-outline',
    fraud_providers: 'finger-print-outline',
    freeze_evidence_actions: 'snow-outline',
    member_education: 'school-outline',
    production_qa: 'phone-portrait-outline',
  };
  return icons[id];
}

function AbuseFraudReadinessCard({snapshot}:{snapshot:AbuseFraudReadinessSnapshot}){
  const ready=snapshot.status==='Ready for safe scale';
  return <View style={adminOpsStyles.abuseFraudCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'shield-checkmark':'shield-half-outline'} tone={ready?'gold':'ruby'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>ABUSE / FRAUD PROTECTION GATE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} protection gates ready. Core anti-scam rules are app-ready; device risk, CAPTCHA and real-device drills remain final scale work.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Core</Text><Text style={adminOpsStyles.areaScore}>{snapshot.coreProtectionScore}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Provider</Text><Text style={adminOpsStyles.areaScore}>{snapshot.providerProtectionScore}%</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockerCount}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><AbuseFraudGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function AbuseFraudGateRow({gate}:{gate:AbuseFraudGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':abuseFraudGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function trustOpsGateIcon(id: TrustOpsGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<TrustOpsGate['id'], keyof typeof Ionicons.glyphMap> = {
    reviewer_staffing: 'people-outline',
    sla_coverage: 'time-outline',
    critical_escalation: 'warning-outline',
    evidence_audit: 'folder-open-outline',
    member_safety_actions: 'shield-checkmark-outline',
    appeals_support: 'headset-outline',
    reviewer_access: 'key-outline',
    incident_drill: 'stopwatch-outline',
  };
  return icons[id];
}

function TrustOpsSlaCard({snapshot}:{snapshot:TrustOpsSnapshot}){
  const ready=snapshot.status==='Ready for staffed pilot';
  return <View style={adminOpsStyles.trustOpsCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'shield-checkmark':'shield-outline'} tone={ready?'gold':'ruby'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>TRUST OPS SLA</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} safety operations gates ready. Source controls exist; staffing, access and drill evidence still decide launch readiness.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Reviewers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.requiredReviewers}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Fastest SLA</Text><Text style={adminOpsStyles.areaScore}>{snapshot.fastestSlaHours}h</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>High risk</Text><Text style={adminOpsStyles.areaScore}>{snapshot.highRiskCases}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Human review</Text><Text style={adminOpsStyles.areaScore}>{snapshot.humanReviewCases}</Text></View>
    </View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><TrustOpsGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function TrustOpsGateRow({gate}:{gate:TrustOpsGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':trustOpsGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function legalStoreOpsGateIcon(id: LegalStoreOpsGate['id']): keyof typeof Ionicons.glyphMap {
  const icons: Record<LegalStoreOpsGate['id'], keyof typeof Ionicons.glyphMap> = {
    legal_documents: 'document-text-outline',
    public_urls: 'globe-outline',
    data_safety_labels: 'shield-checkmark-outline',
    store_review_pack: 'storefront-outline',
    subscription_disclosure: 'card-outline',
    age_delete_controls: 'person-remove-outline',
  };
  return icons[id];
}

function LegalStoreOpsCard({snapshot}:{snapshot:LegalStoreOpsSnapshot}){
  const ready=snapshot.status==='Ready for store submission';
  return <View style={adminOpsStyles.legalOpsCard}>
    <View style={shared.row}>
      <PremiumIcon name={ready?'ribbon':'document-lock-outline'} tone={ready?'gold':'rose'} size={54} iconSize={25}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>LEGAL / STORE OPS</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} store/legal gates ready. This keeps Play Store/App Store submission honest before production provider keys go live.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Ready</Text><Text style={adminOpsStyles.areaScore}>{snapshot.readyCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blockers</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockers.length}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Public URLs</Text><Text style={adminOpsStyles.areaScore}>{snapshot.gates.find(gate=>gate.id==='public_urls')?.ready?'Ready':'No'}</Text></View>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.gates.map(gate=><LegalStoreOpsGateRow key={gate.id} gate={gate}/>)}</View>
  </View>
}

function LegalStoreOpsGateRow({gate}:{gate:LegalStoreOpsGate}){
  const tone:PremiumIconTone=gate.ready?'gold':gate.started?'rose':'ruby';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={gate.ready?'checkmark-circle':legalStoreOpsGateIcon(gate.id)} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
      {!gate.ready&&<Text style={adminOpsStyles.nextTiny}>Next: {gate.nextStep}</Text>}
    </View>
  </View>
}

function P1OperationsCard({snapshot}:{snapshot:P1OperationsSnapshot}){
  return <View style={adminOpsStyles.releaseCard}>
    <View style={shared.row}>
      <PremiumIcon name={snapshot.status==='P1 ready'?'rocket':'layers-outline'} tone={snapshot.status==='P1 ready'?'gold':'rose'} size={52} iconSize={24}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>P1 OPERATIONS</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount} ready · {snapshot.startedCount} started · {snapshot.blockedCount} blocked. This is the bridge from polished MVP to real city operations.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.nextOpsCard}>
      <MiniPremiumIcon name="navigate-circle-outline" tone="gold" size={30} iconSize={14}/>
      <Text style={adminOpsStyles.nextOpsText}>{snapshot.nextBestStep}</Text>
    </View>
    <View style={adminOpsStyles.areaGrid}>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Ready</Text><Text style={adminOpsStyles.areaScore}>{snapshot.readyCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Started</Text><Text style={adminOpsStyles.areaScore}>{snapshot.startedCount}</Text></View>
      <View style={adminOpsStyles.areaPill}><Text style={adminOpsStyles.areaLabel}>Blocked</Text><Text style={adminOpsStyles.areaScore}>{snapshot.blockedCount}</Text></View>
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.items.map(item=><P1OperationRow key={item.id} item={item}/>)}</View>
  </View>
}

function P1OperationRow({item}:{item:P1OperationItem}){
  const tone:PremiumIconTone=item.status==='ready'?'gold':item.status==='started'?'rose':'ruby';
  const icon=item.status==='ready'?'checkmark-circle':item.status==='started'?'construct-outline':'alert-circle-outline';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={icon} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <View style={shared.row}>
        <Text style={[adminOpsStyles.qualityRowTitle,{flex:1}]}>{item.title}</Text>
        {item.storeCritical&&<View style={adminOpsStyles.storeCriticalPill}><Text style={adminOpsStyles.storeCriticalText}>Store</Text></View>}
      </View>
      <Text style={adminOpsStyles.qualityRowBody}>{item.body}</Text>
      {item.status!=='ready'&&<Text style={adminOpsStyles.nextTiny}>Next: {item.nextStep}</Text>}
    </View>
  </View>
}

function ProductQualityCard({snapshot}:{snapshot:ReturnType<typeof buildProductQualitySnapshot>}){
  const status=snapshot.blockers.length?'Needs fixes':snapshot.important.length?'Almost ready':'Ready';
  return <View style={adminOpsStyles.qualityCard}>
    <View style={shared.row}>
      <PremiumIcon name={snapshot.blockers.length?'warning':'checkmark-circle'} tone={snapshot.blockers.length?'ruby':'gold'} size={52} iconSize={24}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>PRODUCT QA</Text>
        <Text style={adminOpsStyles.qualityTitle}>{status} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyItems}/{snapshot.totalItems} readiness checks complete. Backend remains last by design.</Text>
      </View>
      <Text style={adminOpsStyles.qualityScore}>{snapshot.score}</Text>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.items.map(item=><ProductQualityRow key={item.id} item={item}/>)}</View>
  </View>
}

function ProductQualityRow({item}:{item:ProductQualityItem}){
  const tone:PremiumIconTone=item.ready?'gold':item.severity==='blocker'?'ruby':'rose';
  return <View style={adminOpsStyles.qualityRow}>
    <MiniPremiumIcon name={item.ready?'checkmark-circle':item.severity==='blocker'?'alert-circle-outline':'time-outline'} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{item.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{item.body}</Text>
    </View>
  </View>
}

function InteractionQualityCard({snapshot}:{snapshot:InteractionAuditSnapshot}){
  const criticalOk=snapshot.criticalMissing.length===0;
  const topAreas=snapshot.areaSummary.filter(area=>area.total>=3).slice(0,6);
  return <View style={adminOpsStyles.interactionCard}>
    <View style={shared.row}>
      <PremiumIcon name={criticalOk?'flash':'warning'} tone={criticalOk?'gold':'ruby'} size={52} iconSize={24}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>INTERACTION QA</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.score}% button-flow coverage</Text>
        <Text style={styles.helper}>{snapshot.implemented}/{snapshot.total} important interactions mapped · {snapshot.criticalTotal} critical actions protected.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.areaGrid}>{topAreas.map(area=><View key={area.area} style={adminOpsStyles.areaPill}>
      <Text style={adminOpsStyles.areaLabel}>{area.area.replace('_',' ')}</Text>
      <Text style={adminOpsStyles.areaScore}>{area.implemented}/{area.total}</Text>
    </View>)}</View>
    <View style={adminOpsStyles.interactionNotice}>
      <MiniPremiumIcon name={criticalOk?'checkmark-circle':'alert-circle-outline'} tone={criticalOk?'gold':'ruby'} size={30} iconSize={14}/>
      <Text style={adminOpsStyles.interactionNoticeText}>{criticalOk?'No critical interaction gaps detected. Chat tools, gifts, pricing, safety, support and dates have mapped outcomes.':`${snapshot.criticalMissing.length} critical interaction(s) need attention before release.`}</Text>
    </View>
  </View>
}

function PolicyComplianceCard({snapshot}:{snapshot:PolicyComplianceSnapshot}){
  return <View style={adminOpsStyles.releaseCard}>
    <View style={shared.row}>
      <PremiumIcon name={snapshot.ready?'shield-checkmark':'shield-outline'} tone={snapshot.ready?'gold':'rose'} size={52} iconSize={24}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>DATING POLICY COMPLIANCE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.ready?'Policy-ready':'Policy blockers'} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} store-policy controls ready for dating, chat, subscriptions, safety and real-world meetups.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.areaGrid}>{snapshot.items.map(item=><View key={item.id} style={adminOpsStyles.areaPill}>
      <Text style={adminOpsStyles.areaLabel}>{item.area.replace('_',' ')}</Text>
      <Text style={adminOpsStyles.areaScore}>{item.ready?'Ready':'Check'}</Text>
    </View>)}</View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.items.map(item=><View key={item.id} style={adminOpsStyles.qualityRow}>
      <MiniPremiumIcon name={item.ready?'checkmark-circle':'alert-circle-outline'} tone={item.ready?'gold':'ruby'} size={28} iconSize={13}/>
      <View style={{flex:1}}>
        <Text style={adminOpsStyles.qualityRowTitle}>{item.title}</Text>
        <Text style={adminOpsStyles.qualityRowBody}>{item.body}</Text>
      </View>
    </View>)}</View>
  </View>
}

function StoreReviewCard({snapshot}:{snapshot:StoreReviewSnapshot}){
  return <View style={adminOpsStyles.releaseCard}>
    <View style={shared.row}>
      <PremiumIcon name={snapshot.ready?'storefront':'clipboard'} tone={snapshot.ready?'gold':'rose'} size={52} iconSize={24}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>STORE REVIEW PACK</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.ready?'Reviewer-ready':'Reviewer blockers'} · {snapshot.score}%</Text>
        <Text style={styles.helper}>{snapshot.readyCount}/{snapshot.total} review checks complete. This is the handoff reviewers need to enter and test the app.</Text>
      </View>
    </View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${snapshot.score}%`}]}/></View>
    <View style={adminOpsStyles.releaseList}>
      <Text style={adminOpsStyles.releaseListTitle}>Reviewer instructions</Text>
      {snapshot.reviewerInstructions.map((instruction,index)=><View key={instruction} style={adminOpsStyles.releaseGateRow}>
        <MiniPremiumIcon name={index<2?'key-outline':'navigate-circle-outline'} tone={index<2?'gold':'rose'} size={28} iconSize={13}/>
        <Text style={[adminOpsStyles.qualityRowBody,{flex:1}]}>{instruction}</Text>
      </View>)}
    </View>
    <View style={adminOpsStyles.qualityRows}>{snapshot.items.map(item=><View key={item.id} style={adminOpsStyles.qualityRow}>
      <MiniPremiumIcon name={item.ready?'checkmark-circle':'alert-circle-outline'} tone={item.ready?'gold':'ruby'} size={28} iconSize={13}/>
      <View style={{flex:1}}>
        <Text style={adminOpsStyles.qualityRowTitle}>{item.title}</Text>
        <Text style={adminOpsStyles.qualityRowBody}>{item.body}</Text>
      </View>
    </View>)}</View>
  </View>
}

function ReleaseReadinessCard({snapshot}:{snapshot:ReleaseReadinessSnapshot}){
  const finalItems=snapshot.finalConnection.slice(0,5);
  return <View style={adminOpsStyles.releaseCard}>
    <View style={shared.row}>
      <PremiumIcon name={snapshot.storeReady?'rocket':'cloud-upload-outline'} tone={snapshot.storeReady?'gold':'rose'} size={52} iconSize={24}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>STORE RELEASE</Text>
        <Text style={adminOpsStyles.qualityTitle}>{snapshot.storeReady?'Store ready':'Final connections pending'}</Text>
        <Text style={styles.helper}>Preview {snapshot.previewScore}% · Store-critical {snapshot.storeScore}% · {snapshot.storeBlockers.length} store blocker(s).</Text>
      </View>
    </View>
    <View style={adminOpsStyles.releaseMeterRow}>
      <ReleaseMeter label="Preview" value={snapshot.previewScore}/>
      <ReleaseMeter label="Store" value={snapshot.storeScore}/>
    </View>
    {finalItems.length>0&&<View style={adminOpsStyles.releaseList}>
      <Text style={adminOpsStyles.releaseListTitle}>Final connection items</Text>
      {finalItems.map(item=><ReleaseGateRow key={item.id} gate={item}/>)}
    </View>}
    {snapshot.blockers.length>0&&<View style={adminOpsStyles.releaseList}>
      <Text style={adminOpsStyles.releaseListTitle}>Must fix before preview</Text>
      {snapshot.blockers.map(item=><ReleaseGateRow key={item.id} gate={item}/>)}
    </View>}
  </View>
}

function ReleaseMeter({label,value}:{label:string;value:number}){
  return <View style={adminOpsStyles.releaseMeter}>
    <View style={shared.row}><Text style={adminOpsStyles.releaseMeterLabel}>{label}</Text><View style={shared.spacer}/><Text style={adminOpsStyles.releaseMeterValue}>{value}%</Text></View>
    <View style={adminOpsStyles.qualityTrack}><View style={[adminOpsStyles.qualityFill,{width:`${value}%`}]}/></View>
  </View>
}

function ReleaseGateRow({gate}:{gate:ReleaseGate}){
  const tone:PremiumIconTone=gate.status==='ready'?'gold':gate.status==='blocked'?'ruby':'rose';
  const icon=gate.status==='ready'?'checkmark-circle':gate.status==='blocked'?'alert-circle-outline':'construct-outline';
  return <View style={adminOpsStyles.releaseGateRow}>
    <MiniPremiumIcon name={icon} tone={tone} size={28} iconSize={13}/>
    <View style={{flex:1}}>
      <Text style={adminOpsStyles.qualityRowTitle}>{gate.title}</Text>
      <Text style={adminOpsStyles.qualityRowBody}>{gate.body}</Text>
    </View>
  </View>
}

function ModerationCaseCard({item,onFreeze,onEscalate,onResolve,onEvidence}:{item:ModerationQueueItem;onFreeze:()=>void;onEscalate:()=>void;onResolve:()=>void;onEvidence:()=>void}){
  const riskStyle=item.risk==='Critical'?adminOpsStyles.riskCritical:item.risk==='High'?adminOpsStyles.riskHigh:item.risk==='Medium'?adminOpsStyles.riskMedium:adminOpsStyles.riskLow;
  return <View style={adminOpsStyles.caseCard}>
    <View style={shared.row}>
      <View style={[adminOpsStyles.riskDot,riskStyle]}/>
      <View style={{flex:1}}>
        <Text style={styles.cardTitle}>{item.member}</Text>
        <Text style={adminOpsStyles.caseMeta}>{item.category.replace('_',' ')} · SLA {item.slaHours}h · score {item.riskScore}</Text>
      </View>
      <View style={[adminOpsStyles.riskPill,riskStyle]}><Text style={adminOpsStyles.riskText}>{item.risk}</Text></View>
    </View>
    <Text style={styles.helper}>{item.reason}</Text>
    <View style={adminOpsStyles.evidenceWrap}>{item.evidence.map(evidence=><View key={evidence} style={adminOpsStyles.evidencePill}><Text style={adminOpsStyles.evidenceText}>{evidence}</Text></View>)}</View>
    <View style={ventureStyles.nextStep}><MiniPremiumIcon name="construct" tone="rose" size={30} iconSize={14}/><Text style={ventureStyles.nextText}>{item.action}</Text></View>
    <View style={adminOpsStyles.caseFooter}>
      <ModerationStatusPill status={item.status}/>
      {item.humanReviewRequired&&<View style={adminOpsStyles.reviewPill}><Text style={adminOpsStyles.reviewText}>Human review</Text></View>}
      {item.canAutoHide&&<View style={adminOpsStyles.autoPill}><Text style={adminOpsStyles.autoText}>Auto-hide eligible</Text></View>}
    </View>
    <View style={adminOpsStyles.actionRow}>
      <Pressable onPress={onEvidence} style={adminOpsStyles.ghostAction}><Text style={adminOpsStyles.ghostActionText}>Evidence</Text></Pressable>
      <Pressable onPress={onFreeze} style={adminOpsStyles.ghostAction}><Text style={adminOpsStyles.ghostActionText}>Freeze</Text></Pressable>
      <Pressable onPress={onEscalate} style={adminOpsStyles.primaryAction}><Text style={adminOpsStyles.primaryActionText}>Escalate</Text></Pressable>
      <Pressable onPress={onResolve} style={adminOpsStyles.ghostAction}><Text style={adminOpsStyles.ghostActionText}>Resolve</Text></Pressable>
    </View>
  </View>
}

function ModerationStatusPill({status}:{status:ModerationStatus}){
  const label=status==='new'?'New':status==='triage'?'Triage':status==='frozen'?'Frozen':status==='escalated'?'Escalated':'Resolved';
  return <View style={adminOpsStyles.statusPill}><Text style={adminOpsStyles.statusPillText}>{label}</Text></View>
}

const dateCategories=[
  {name:'Café',icon:'cafe' as const},
  {name:'Walk',icon:'leaf' as const},
  {name:'Dinner',icon:'restaurant' as const},
  {name:'Activity',icon:'color-palette' as const},
];
type DateVenue={id:string;name:string;category:string;area:string;price:string;vibe:string;icon:string};
const dateVenues:DateVenue[]=[
  {id:'cafe-1',name:'Juniper Café',category:'Café',area:'Near the city center',price:'$$',vibe:'Quiet tables · Great conversation',icon:'☕'},
  {id:'cafe-2',name:'The Garden Coffee Room',category:'Café',area:'A lively public neighborhood',price:'$$',vibe:'Bright · Relaxed · Weekend-friendly',icon:'🌿'},
  {id:'walk-1',name:'Riverside Promenade',category:'Walk',area:'Popular waterfront area',price:'Free',vibe:'Scenic · Public · Easygoing',icon:'🌅'},
  {id:'walk-2',name:'Botanical Garden Stroll',category:'Walk',area:'Central garden district',price:'$',vibe:'Calm · Beautiful · Daytime',icon:'🌷'},
  {id:'dinner-1',name:'Candlelight Kitchen',category:'Dinner',area:'Restaurant district',price:'$$$',vibe:'Warm · Vegetarian-friendly options',icon:'🍽️'},
  {id:'dinner-2',name:'Spice & Stories',category:'Dinner',area:'Busy public square',price:'$$',vibe:'Indian-inspired · Conversation-friendly',icon:'✨'},
  {id:'activity-1',name:'Clay & Chai Studio',category:'Activity',area:'Arts district',price:'$$',vibe:'Creative · Low pressure · Memorable',icon:'🎨'},
  {id:'activity-2',name:'Mini Golf Social',category:'Activity',area:'Entertainment district',price:'$$',vibe:'Playful · Public · Easy icebreaker',icon:'⛳'},
];
const dateTimes=['Friday · 7:00 PM','Saturday · 11:00 AM','Saturday · 5:00 PM','Sunday · 4:00 PM'];

function DatePlanner({match,preset,onBack,onSend}:{match:Match;preset?:PlaceItem|null;onBack:()=>void;onSend:(message:ChatMessage)=>Promise<boolean>}){
  const presetCategory=preset?(['Restaurant','Hotel','Lounge'].includes(preset.kind)?'Dinner':preset.kind==='Cafe'||preset.kind==='Dessert'?'Café':preset.kind==='Park'||preset.kind==='Tourist'?'Walk':'Activity'):'Café';
  const presetVenue:DateVenue|undefined=preset?{id:`market-${preset.id}`,name:preset.name,category:presetCategory,area:`${preset.area} · ${preset.city}`,price:preset.price,vibe:preset.vibe,icon:preset.icon}:undefined;
  const plannerVenues=presetVenue?[presetVenue,...dateVenues]:dateVenues;
  const [category,setCategory]=useState(presetCategory);
  const [venueId,setVenueId]=useState(presetVenue?.id??'');
  const [time,setTime]=useState('');
  const [packageId,setPackageId]=useState(datePackages[0]?.id??'');
  const [useArea,setUseArea]=useState(false);
  const [safetyCheckIn,setSafetyCheckIn]=useState(true);
  const [sharePlan,setSharePlan]=useState(false);
  const [locationError,setLocationError]=useState('');
  const [reservationStatus,setReservationStatus]=useState<DateReservationStatus>('idle');
  const [paymentError,setPaymentError]=useState('');
  const [applePaySupported,setApplePaySupported]=useState(false);
  const venues=plannerVenues.filter(venue=>venue.category===category);
  const selectedVenue=plannerVenues.find(venue=>venue.id===venueId);
  const selectedPackage=datePackages.find(item=>item.id===packageId);
  const reservationQuote=selectedVenue?estimateDateReservationQuote({venueId:selectedVenue.id,venueName:selectedVenue.name,amountCents:1000,currency:'usd'}):null;
  const planProgress=(selectedVenue?34:0)+(time?33:0)+(safetyCheckIn?33:20);
  const planSteps:Array<{icon:keyof typeof Ionicons.glyphMap;label:string;done:boolean}>=[
    {icon:'restaurant',label:'Place',done:!!selectedVenue},
    {icon:'time',label:'Time',done:!!time},
    {icon:'shield-checkmark',label:'Safety',done:safetyCheckIn},
  ];
  useEffect(()=>{
    if(Platform.OS!=='ios'||!paymentsConfigured)return;
    void checkApplePaySupport().then(setApplePaySupported).catch(()=>setApplePaySupported(false));
  },[]);
  const selectCategory=(next:string)=>{setCategory(next);setVenueId('')};
  const choosePackage=(item:DatePackage)=>{
    setPackageId(item.id);
    setReservationStatus('idle');
    setPaymentError('');
    const nextCategory=item.icon==='restaurant'||item.icon==='wine'||item.icon==='diamond'?'Dinner':item.icon==='color-palette'?'Activity':'Café';
    if(nextCategory!==category){setCategory(nextCategory);setVenueId('')}
  };
  const enableArea=async()=>{
    if(useArea){setUseArea(false);return}
    setLocationError('');
    const permission=await Location.requestForegroundPermissionsAsync();
    if(!permission.granted){setLocationError('Approximate location permission is needed to find nearby date ideas.');return}
    try{await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Low});setUseArea(true)}catch{setLocationError('Could not find your approximate area. You can still choose a sample venue.')}
  };
  const reserveDate=async()=>{
    if(!selectedVenue||reservationStatus==='processing')return;
    setPaymentError('');setReservationStatus('processing');
    try{
      const intent=await createDateReservationIntent({venueId:selectedVenue.id,venueName:selectedVenue.name,amountCents:reservationQuote?.amountCents??1000,currency:'usd'});
      if(intent.demo){setReservationStatus('reserved');return}
      if(Platform.OS!=='ios'||!applePaySupported||!intent.clientSecret)throw new Error('Apple Pay is not available on this device.');
      await confirmApplePayReservation(intent.clientSecret,selectedVenue.name,'10.00');
      setReservationStatus('reserved');
    }catch(error){setReservationStatus('idle');setPaymentError(error instanceof Error?error.message:'Secure checkout could not be completed.')}
  };
  const sendPlan=async()=>{if(!selectedVenue||!time)return;await onSend({id:`date-${Date.now()}`,type:'date',date:{venue:selectedVenue.name,category:selectedVenue.category,area:useArea?'Near your approximate area':selectedVenue.area,time,safetyCheckIn,packageTitle:selectedPackage?.title,packageTier:selectedPackage?.tier,planStatus:'proposed'},createdAt:Date.now(),status:'sent'})};
  return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}><SafeAreaView style={shared.safe}><View style={dateStyles.header}><Pressable onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable><View style={{marginLeft:12}}><Text style={styles.cardTitle}>Plan a date with {match.name}</Text><Text style={styles.helper}>Suggest, don’t pressure</Text></View></View><ScrollView contentContainerStyle={dateStyles.content} showsVerticalScrollIndicator={false}><View style={dateStyles.hero}><PremiumIcon name="calendar" tone="gold" size={66} iconSize={30}/><Text style={[shared.h1,{textAlign:'center'}]}>Turn a good chat into a real moment.</Text><Text style={[shared.body,{textAlign:'center'}]}>Choose a public place and a time. {match.name} can accept or suggest something different.</Text></View><View style={dateStyles.planStatusCard}><View style={shared.row}><View style={{flex:1}}><Text style={styles.kicker}>PLAN READINESS</Text><Text style={dateStyles.planStatusTitle}>{selectedVenue&&time?'Ready to suggest':selectedVenue?'Pick a time next':'Choose a place first'}</Text></View><Text style={dateStyles.planStatusPercent}>{Math.min(100,planProgress)}%</Text></View><View style={dateStyles.planTrack}><View style={[dateStyles.planFill,{width:`${Math.min(100,planProgress)}%`}]}/></View><View style={dateStyles.planStepRow}>{planSteps.map(step=><View key={step.label} style={dateStyles.planStep}><MiniPremiumIcon name={step.icon} tone={step.done?'gold':'dark'} size={26} iconSize={12}/><Text style={[dateStyles.planStepText,step.done&&{color:colors.ivory}]}>{step.label}</Text></View>)}</View></View><Pressable onPress={()=>void enableArea()} style={[dateStyles.areaButton,useArea&&dateStyles.areaButtonOn]}><PremiumIcon name={useArea?'location':'location-outline'} tone={useArea?'gold':'rose'} size={44} iconSize={20}/><View style={{flex:1}}><Text style={styles.cardTitle}>{useArea?'Using your approximate area':'Find ideas near me'}</Text><Text style={styles.helper}>Foreground location only · exact location never shared</Text></View><MiniPremiumIcon name={useArea?'checkmark-circle':'chevron-forward'} tone={useArea?'gold':'dark'} size={34} iconSize={16}/></Pressable>{!!locationError&&<Text style={styles.formError}>{locationError}</Text>}<View style={{gap:11}}><View style={shared.row}><Text style={styles.sectionLabel}>DATE PACKAGE</Text><View style={shared.spacer}/><Text style={dateStyles.sampleLabel}>{selectedPackage?.tier??'Choose one'}</Text></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:9}}>{datePackages.map(item=><Pressable key={item.id} onPress={()=>choosePackage(item)} style={[dateStyles.packageSelect,packageId===item.id&&dateStyles.packageSelectOn]}><MiniPremiumIcon name={item.icon} tone={packageId===item.id?'gold':'rose'} size={30} iconSize={14}/><Text style={[dateStyles.packageSelectTitle,packageId===item.id&&{color:colors.ivory}]}>{item.title}</Text><Text style={dateStyles.packageSelectMeta}>{item.price}</Text></Pressable>)}</ScrollView></View><View style={{gap:11}}><Text style={styles.sectionLabel}>WHAT FEELS RIGHT?</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:9}}>{dateCategories.map(item=><Pressable key={item.name} onPress={()=>selectCategory(item.name)} style={[dateStyles.category,category===item.name&&dateStyles.categoryOn]}><MiniPremiumIcon name={item.icon} tone={category===item.name?'gold':'rose'} size={30} iconSize={14}/><Text style={[dateStyles.categoryText,category===item.name&&{color:colors.ivory}]}>{item.name}</Text></Pressable>)}</ScrollView></View><View style={{gap:10}}><View style={shared.row}><Text style={styles.sectionLabel}>CURATED IDEAS</Text><View style={shared.spacer}/><Text style={dateStyles.sampleLabel}>SAMPLE VENUES</Text></View>{venues.map(venue=><Pressable key={venue.id} onPress={()=>{setVenueId(venue.id);setReservationStatus('idle');setPaymentError('')}} style={[dateStyles.venueCard,venueId===venue.id&&dateStyles.venueCardOn]}><Text style={dateStyles.venueEmoji}>{venue.icon}</Text><View style={{flex:1}}><Text style={styles.cardTitle}>{venue.name}</Text><Text style={dateStyles.venueVibe}>{venue.vibe}</Text><Text style={styles.helper}>{useArea?'Near your approximate area':venue.area} · {venue.price}</Text></View><MiniPremiumIcon name={venueId===venue.id?'checkmark-circle':'ellipse-outline'} tone={venueId===venue.id?'gold':'dark'} size={34} iconSize={16}/></Pressable>)}</View><View style={{gap:10}}><Text style={styles.sectionLabel}>PICK A TIME</Text><View style={dateStyles.timeGrid}>{dateTimes.map(option=><Pressable key={option} onPress={()=>setTime(option)} style={[dateStyles.timeChip,time===option&&dateStyles.timeChipOn]}><Text style={[dateStyles.timeText,time===option&&{color:colors.ivory}]}>{option}</Text></Pressable>)}</View></View><View style={dateStyles.safetyCard}><View style={shared.row}><PremiumIcon name="shield-checkmark" tone="gold" size={44} iconSize={20}/><Text style={[styles.cardTitle,{marginLeft:8}]}>Date safety</Text></View><DateToggle title="Check in after the date" body="DestinyOne reminds you to confirm you’re safe." value={safetyCheckIn} onPress={()=>setSafetyCheckIn(value=>!value)}/><DateToggle title="Share plan with a trusted contact" body="Prepared for secure sharing when contacts backend is connected." value={sharePlan} onPress={()=>setSharePlan(value=>!value)}/></View><DatePlanPreview venue={selectedVenue} packageTitle={selectedPackage?.title} packageTier={selectedPackage?.tier} time={time} useArea={useArea} safetyCheckIn={safetyCheckIn} sharePlan={sharePlan}/><View style={dateStyles.sampleNotice}><MiniPremiumIcon name="information-circle-outline" tone="gold" size={34} iconSize={16}/><Text style={[styles.helper,{flex:1}]}>Venue cards are MVP samples. Production connects a Places provider for live cafés, opening hours, ratings and map directions.</Text></View><ReservationCheckout venue={selectedVenue} quote={reservationQuote} status={reservationStatus} applePaySupported={applePaySupported} error={paymentError} onReserve={()=>void reserveDate()}/><Button disabled={!selectedVenue||!time} label={selectedVenue&&time?`Suggest to ${match.name}`:'Choose a place and time'} icon="send" onPress={sendPlan}/></ScrollView></SafeAreaView></LinearGradient>
}

function DatePlanPreview({venue,packageTitle,packageTier,time,useArea,safetyCheckIn,sharePlan}:{venue?:typeof dateVenues[number];packageTitle?:string;packageTier?:string;time:string;useArea:boolean;safetyCheckIn:boolean;sharePlan:boolean}){
  return <View style={dateStyles.previewCard}><View style={shared.row}><PremiumIcon name="reader-outline" tone="gold" size={42} iconSize={19}/><View style={{flex:1,marginLeft:10}}><Text style={styles.cardTitle}>Plan preview</Text><Text style={styles.helper}>This is what gets sent in chat.</Text></View></View><View style={dateStyles.previewLine}><Text style={dateStyles.previewLabel}>Package</Text><Text style={dateStyles.previewValue}>{packageTitle?`${packageTitle}${packageTier?` · ${packageTier}`:''}`:'Choose a package'}</Text></View><View style={dateStyles.previewLine}><Text style={dateStyles.previewLabel}>Place</Text><Text style={dateStyles.previewValue}>{venue?.name??'Choose a curated idea'}</Text></View><View style={dateStyles.previewLine}><Text style={dateStyles.previewLabel}>Area</Text><Text style={dateStyles.previewValue}>{venue?useArea?'Near your approximate area':venue.area:'—'}</Text></View><View style={dateStyles.previewLine}><Text style={dateStyles.previewLabel}>Time</Text><Text style={dateStyles.previewValue}>{time||'Pick a time'}</Text></View><View style={dateStyles.previewFlags}><View style={dateStyles.previewFlag}><MiniPremiumIcon name="shield-checkmark" tone="gold" size={24} iconSize={11}/><Text style={dateStyles.previewFlagText}>{safetyCheckIn?'Check-in on':'Check-in off'}</Text></View>{sharePlan&&<View style={dateStyles.previewFlag}><MiniPremiumIcon name="share-social" tone="rose" size={24} iconSize={11}/><Text style={dateStyles.previewFlagText}>Trusted contact ready</Text></View>}</View></View>
}

function ReservationCheckout({venue,quote,status,applePaySupported,error,onReserve}:{venue?:typeof dateVenues[number];quote:DateReservationQuote|null;status:DateReservationStatus;applePaySupported:boolean;error:string;onReserve:()=>void}){
  if(!venue||!quote)return null;
  const useApplePay=Platform.OS==='ios'&&dateReservationMode==='live'&&applePaySupported;
  const checkoutBlocked=dateReservationMode==='blocked';
  const steps=buildDateReservationSteps(status);
  return <View style={launchStyles.checkoutCard}>
    <View style={shared.row}><PremiumIcon name="wallet" tone="gold" size={44} iconSize={20}/><View style={{flex:1,marginLeft:11}}><Text style={styles.cardTitle}>Easy reservation</Text><Text style={styles.helper}>{dateReservationStatusCopy(status,quote)}</Text></View>{status==='reserved'&&<MiniPremiumIcon name="checkmark-circle" tone="gold" size={34} iconSize={16}/>}</View>
    <View style={dateStyles.reservationSteps}>{steps.map(step=><View key={step.label} style={dateStyles.reservationStep}><View style={[dateStyles.reservationDot,step.status==='done'&&dateStyles.reservationDotDone,step.status==='active'&&dateStyles.reservationDotActive]}/><Text style={[dateStyles.reservationStepTitle,step.status==='active'&&{color:colors.ivory}]}>{step.label}</Text><Text style={dateStyles.reservationStepBody}>{step.body}</Text></View>)}</View>
    <View style={dateStyles.reservationPolicy}><GiftQuoteInfoRow icon="shield-checkmark" text={quote.safetyPolicy}/><GiftQuoteInfoRow icon="refresh-circle" text={quote.refundPolicy}/><GiftQuoteInfoRow icon="card" text={`${quote.providerLabel} · quote expires in 12 min`}/></View>
    {status==='reserved'?<View style={launchStyles.reservedPill}><MiniPremiumIcon name="checkmark" tone="gold" size={24} iconSize={11}/><Text style={launchStyles.reservedText}>{dateReservationMode==='live'?'Reservation request created securely.':'Reservation demo saved on this device.'}</Text></View>:useApplePay?<ApplePayReservationButton onPress={onReserve}/>:<Button label={checkoutBlocked?'Reservation connection required':status==='processing'?'Preparing secure checkout…':dateReservationMode==='live'?`Reserve securely · ${formatPaymentMoney(quote.amountCents,quote.currency)}`:`Try reservation demo · ${formatPaymentMoney(quote.amountCents,quote.currency)}`} disabled={status==='processing'||checkoutBlocked} icon="wallet-outline" onPress={onReserve}/>} 
    {!!error&&<Text style={styles.formError}>{error}</Text>}
    <Text style={launchStyles.paymentFine}>Apple Pay is for real-world venue reservations. Plus and gift coins use Apple/Google in-app billing so purchases remain restorable and store-compliant.</Text>
  </View>
}

function DateToggle({title,body,value,onPress}:{title:string;body:string;value:boolean;onPress:()=>void}){return <Pressable onPress={onPress} style={dateStyles.toggle}><View style={{flex:1}}><Text style={dateStyles.toggleTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View><View style={[discoveryStyles.switch,value&&discoveryStyles.switchOn]}><View style={[discoveryStyles.switchThumb,value&&discoveryStyles.switchThumbOn]}/></View></Pressable>}

function MatchCard({match,reasons,onPress,onInterested,onSkip,onRose,compact=false}:{match:Match;reasons:string[];onPress:()=>void;onInterested:()=>void;onSkip:()=>void;onRose:()=>void;compact?:boolean}){
  const {width}=useWindowDimensions();
  const pan=useRef(new Animated.ValueXY()).current;
  const rotate=pan.x.interpolate({inputRange:[-180,0,180],outputRange:['-8deg','0deg','8deg']});
  const yesOpacity=pan.x.interpolate({inputRange:[20,120],outputRange:[0,1],extrapolate:'clamp'});
  const nopeOpacity=pan.x.interpolate({inputRange:[-120,-20],outputRange:[1,0],extrapolate:'clamp'});
  const roseOpacity=pan.y.interpolate({inputRange:[-150,-35],outputRange:[1,0],extrapolate:'clamp'});
  const visibleReasons=reasons.slice(0,1);
  const visibleVibes=match.vibes.slice(0,2);
  const hiddenVibes=Math.max(0,match.vibes.length-visibleVibes.length);
  const alignmentLabel=match.familyPriority==='high'?'Family-first':'Balanced future';
  const reset=()=>Animated.spring(pan,{toValue:{x:0,y:0},friction:6,tension:75,useNativeDriver:Platform.OS!=='web'}).start();
  const fly=(toValue:{x:number;y:number},done:()=>void)=>Animated.timing(pan,{toValue,duration:190,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS!=='web'}).start(()=>{pan.setValue({x:0,y:0});done()});
  const panResponder=useRef(PanResponder.create({
    onMoveShouldSetPanResponder:(_,gesture)=>Math.abs(gesture.dx)>8||Math.abs(gesture.dy)>10,
    onPanResponderMove:(_,gesture)=>pan.setValue({x:gesture.dx,y:gesture.dy}),
    onPanResponderRelease:(_,gesture)=>{
      if(gesture.dx>105){fly({x:430,y:gesture.dy},onInterested);return}
      if(gesture.dx<-105){fly({x:-430,y:gesture.dy},onSkip);return}
      if(gesture.dy<-120){fly({x:0,y:-520},onRose);return}
      reset();
    },
    onPanResponderTerminate:reset,
  })).current;
  return <Animated.View {...panResponder.panHandlers} style={[styles.matchCard,!compact&&width<430&&{height:500},compact&&styles.matchCardCompact,swipeStyles.cardLift,{transform:[{translateX:pan.x},{translateY:pan.y},{rotate}]}]}>
    <Pressable onPress={onPress} style={{width:'100%',height:'100%'}}>
      <Image source={{uri:match.photo}} style={styles.matchPhoto}/>
      <LinearGradient colors={['rgba(8,0,2,.12)','rgba(11,11,15,.08)','rgba(11,11,15,.98)']} style={StyleSheet.absoluteFill}/>
      <View style={swipeStyles.matchGlow}/>
      <View style={swipeStyles.photoVignette}/>
      <Animated.View pointerEvents="none" style={[swipeStyles.swipeOverlay,swipeStyles.swipeYes,{opacity:yesOpacity}]}><Text style={swipeStyles.swipeLabel}>SERIOUS YES</Text></Animated.View>
      <Animated.View pointerEvents="none" style={[swipeStyles.swipeOverlay,swipeStyles.swipeNope,{opacity:nopeOpacity}]}><Text style={swipeStyles.swipeLabel}>NOT FOR ME</Text></Animated.View>
      <Animated.View pointerEvents="none" style={[swipeStyles.swipeRose,{opacity:roseOpacity}]}><PremiumIcon name="sparkles" tone="gold" size={46} iconSize={21}/><Text style={swipeStyles.swipeRoseText}>SEND SPARK</Text></Animated.View>
      <View style={styles.matchTop}><View style={swipeStyles.premiumRibbon}><Chip label={match.match} gold/></View></View>
      <View style={[styles.matchInfo,compact&&styles.matchInfoCompact]}><View style={shared.row}><View style={{flex:1}}><Text numberOfLines={1} style={[styles.matchName,compact&&styles.matchNameCompact]}>{match.name}, {match.age}</Text><Text numberOfLines={1} style={[styles.matchMeta,compact&&styles.matchMetaCompact]}>{match.profession} · {match.city}</Text></View><MiniPremiumIcon name="shield-checkmark" tone="plum" size={32} iconSize={15}/></View><View style={swipeStyles.profileSummary}><View style={swipeStyles.summaryItem}><Text style={swipeStyles.summaryLabel}>Intent</Text><Text numberOfLines={2} style={swipeStyles.summaryValue}>{match.intent}</Text></View><View style={swipeStyles.summaryDivider}/><View style={swipeStyles.summaryItem}><Text style={swipeStyles.summaryLabel}>Trust & values</Text><Text numberOfLines={2} style={swipeStyles.summaryValue}>{alignmentLabel} · {match.vouches.count} vouches</Text></View></View>{visibleReasons.length>0&&<View style={swipeStyles.reasonCard}><MiniPremiumIcon name="sparkles" tone="gold" size={28} iconSize={13}/><View style={{flex:1}}><Text style={swipeStyles.reasonTitle}>Why this feels aligned</Text><Text numberOfLines={2} style={swipeStyles.reasonBody}>{visibleReasons.join(' · ')}</Text></View></View>}<View style={styles.chipRow}>{visibleVibes.map(x=><Chip key={x} label={x}/>)}{hiddenVibes>0&&<View style={swipeStyles.morePill}><Text style={swipeStyles.morePillText}>+{hiddenVibes}</Text></View>}</View><View style={styles.cardActions}><Pressable accessibilityRole="button" accessibilityLabel={`Pass on ${match.name}`} onPress={onSkip} style={[styles.nope,compact&&styles.nopeCompact]}><PremiumIcon name="close" tone="dark" size={compact?46:52} iconSize={compact?21:24}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Send ${match.name} a Golden Spark`} onPress={onRose} style={[aiStyles.roseAction,compact&&aiStyles.roseActionCompact]}><PremiumIcon name="sparkles" tone="gold" size={30} iconSize={14}/><Text style={aiStyles.roseActionText}>Spark</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Interested in ${match.name}`} onPress={onInterested} style={[styles.yes,compact&&styles.yesCompact]}><MiniPremiumIcon name="heart" tone="ruby" size={compact?34:38} iconSize={compact?16:18}/><Text style={[styles.yesText,compact&&styles.yesTextCompact]}>Interested</Text></Pressable></View></View>
    </Pressable>
  </Animated.View>
}

function Detail({match,preferences,alignment,back,interested,onRose,onProfileView,onPrivateBlock}:{match:Match;preferences:{intent:string;vibes:string[];filters:MatchFilters};alignment:Record<string,string>;back:()=>void;interested:()=>void;onRose:()=>void;onProfileView:()=>void;onPrivateBlock:()=>void}){
  const reasons=match.reasons??matchReasons(match,preferences);
  useEffect(()=>{
    const timer=setTimeout(onProfileView,5000);
    return()=>clearTimeout(timer);
  },[match.id,onProfileView]);
  return <View style={{flex:1}}><ScrollView contentContainerStyle={{paddingBottom:120}}><View style={styles.hero}><Image source={{uri:match.photo}} style={styles.fill}/><LinearGradient colors={['rgba(11,11,15,.35)','transparent',colors.black]} style={StyleSheet.absoluteFill}/><SafeAreaView><View style={shared.row}><Pressable onPress={back} style={styles.circleBtn}><PremiumIcon name="arrow-back" tone="dark" size={44} iconSize={21}/></Pressable><View style={shared.spacer}/><Pressable onPress={onPrivateBlock} style={styles.detailBlockButton}><PremiumIcon name="ban-outline" tone="ruby" size={40} iconSize={18}/></Pressable></View></SafeAreaView><View style={styles.heroText}><Chip label={match.match} gold/><View style={shared.row}><Text style={styles.detailName}>{match.name}, {match.age}</Text><MiniPremiumIcon name="shield-checkmark" tone="plum" size={34} iconSize={16}/></View><Text style={styles.matchMeta}>{match.profession}  ·  {match.city}</Text><Chip label={match.intent}/></View></View><View style={styles.detailBody}><AlignmentBridge match={match} input={{intent:preferences.intent,alignment}}/>{reasons.length>0&&<View style={aiStyles.detailAi}><View style={shared.row}><MiniPremiumIcon name="sparkles" tone="gold" size={38} iconSize={18}/><Text style={[styles.cardTitle,{marginLeft:8}]}>Why AI surfaced {match.name}</Text></View><View style={aiStyles.reasonRow}>{reasons.map(reason=><View key={reason} style={aiStyles.reasonPill}><Text style={aiStyles.reasonText}>{reason}</Text></View>)}</View><Text style={styles.helper}>Based only on your DestinyOne answers and in-app activity.</Text></View>}<View style={styles.profileViewNotice}><MiniPremiumIcon name="eye-outline" tone="gold" size={36} iconSize={17}/><Text style={[styles.helper,{flex:1}]}>If you spend 5+ seconds here, {match.name} receives a tasteful profile-view notification. Swipe previews stay private.</Text></View><TrustBadges match={match}/><View style={styles.voice}><PremiumIcon name="play" tone="ruby" size={42} iconSize={19}/><View style={{flex:1}}><Text style={shared.label}>Voice introduction</Text><View style={styles.wave}>{[8,17,12,24,15,9,20,12,6,15,20,9].map((h,i)=><View key={i} style={{height:h,width:3,backgroundColor:colors.purpleLight,borderRadius:2}}/>)}</View></View><Text style={styles.helper}>0:24</Text></View><Info title="About me" body={match.about}/><Info title="What I value" body={match.values}/><Info title="The future I’m building" body={match.goals}/><LifeAlignment match={match}/><View style={styles.privateBlockCard}><PremiumIcon name="shield" tone="ruby" size={44} iconSize={21}/><View style={{flex:1}}><Text style={styles.cardTitle}>Private block</Text><Text style={styles.helper}>If someone bothers you, block them quietly. They won’t be notified and they disappear from your app.</Text></View><Pressable onPress={onPrivateBlock} style={styles.privateBlockAction}><Text style={styles.privateBlockText}>Block</Text></Pressable></View><Text style={styles.sectionLabel}>THEIR VIBE</Text><View style={styles.chipRow}>{match.vibes.map(x=><Chip key={x} label={x} selected/>)}</View></View></ScrollView><View style={styles.fixedAction}><Pressable onPress={back} style={styles.nope}><PremiumIcon name="close" tone="dark" size={52} iconSize={24}/></Pressable><Pressable onPress={onRose} style={aiStyles.fixedRose}><PremiumIcon name="sparkles" tone="gold" size={34} iconSize={16}/></Pressable><View style={{flex:1}}><Button label="Explore a serious connection" icon="heart" onPress={interested}/></View></View></View>
}

function AlignmentBridge({match,input}:{match:Match;input:IntentPassportInput}){
  const bridge=buildAlignmentBridge(input,match);
  return <View style={passportStyles.bridge}>
    <View style={passportStyles.bridgeHeader}><PremiumIcon name="git-compare-outline" tone="gold" size={44} iconSize={20}/><View style={{flex:1}}><Text style={styles.sectionLabel}>THE ALIGNMENT BRIDGE</Text><Text style={passportStyles.bridgeTitle}>Clarity before chemistry.</Text></View><View style={passportStyles.alignedPill}><Text style={passportStyles.alignedCount}>{bridge.alignedCount}</Text><Text style={passportStyles.alignedLabel}>clear</Text></View></View>
    <Text style={passportStyles.bridgeIntro}>Compare future essentials in plain language. Differences are conversation topics, not rejection scores.</Text>
    <View style={passportStyles.bridgeList}>{bridge.items.map(item=><AlignmentBridgeRow key={item.id} item={item} matchName={match.name}/>)}</View>
    <View style={passportStyles.promptCard}><MiniPremiumIcon name="chatbubble-ellipses-outline" tone="rose" size={34} iconSize={16}/><View style={{flex:1}}><Text style={passportStyles.promptLabel}>A thoughtful first question</Text><Text style={passportStyles.promptText}>{bridge.conversationPrompt}</Text></View></View>
    {bridge.hasPrivateFields&&<Text style={passportStyles.privacy}>Unshared answers stay private. Complete your Intent Passport to compare them.</Text>}
  </View>
}

function AlignmentBridgeRow({item,matchName}:{item:AlignmentBridgeItem;matchName:string}){
  const icon=item.status==='aligned'?'checkmark-circle':item.status==='discuss'?'chatbubble-ellipses':'lock-closed';
  const tone:PremiumIconTone=item.status==='aligned'?'gold':item.status==='discuss'?'rose':'dark';
  return <View style={passportStyles.bridgeRow}><MiniPremiumIcon name={icon} tone={tone} size={30} iconSize={14}/><View style={{flex:1}}><Text style={passportStyles.bridgeLabel}>{item.label}</Text><Text style={passportStyles.bridgeValues} numberOfLines={2}>You: {item.you}</Text><Text style={passportStyles.bridgeValues} numberOfLines={2}>{matchName}: {item.them}</Text></View><Text style={[passportStyles.status,item.status==='aligned'&&passportStyles.statusAligned]}>{item.status==='aligned'?'ALIGNED':item.status==='discuss'?'DISCUSS':'PRIVATE'}</Text></View>
}

function Mutual({match,next,back}:{match:Match;next:()=>void;back:()=>void}){return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={styles.center}><SafeAreaView style={[shared.safe,{alignItems:'center',justifyContent:'center',gap:26}]}><Text style={styles.kicker}>A NEW BEGINNING</Text><View style={styles.matchFaces}><Image source={{uri:match.photo}} style={[styles.face,{left:0}]}/><View style={styles.matchHeart}><PremiumIcon name="heart" tone="ruby" size={58} iconSize={28}/></View><View style={[styles.face,{right:0,backgroundColor:'#3A1820',alignItems:'center',justifyContent:'center'}]}><Text style={[styles.avatarText,{fontSize:38}]}>A</Text></View></View><View style={{alignItems:'center',gap:10}}><Text style={styles.bigMatch}>It’s a Match</Text><Text style={[shared.body,{textAlign:'center',maxWidth:310}]}>You and {match.name} both felt something worth exploring.</Text></View><View style={[shared.card,{width:'100%',gap:12}]}><View style={shared.row}><PremiumIcon name="chatbubbles-outline" tone="gold" size={44} iconSize={20}/><Text style={[shared.label,{marginLeft:9}]}>One little step before hello</Text></View><Text style={shared.body}>Answer an icebreaker. When you both answer, your chat opens.</Text></View><View style={{width:'100%',gap:8}}><Button label="Break the ice" icon="sparkles" onPress={next}/><Button label="Keep browsing" variant="ghost" onPress={back}/></View></SafeAreaView></LinearGradient>}

function Icebreaker({match,question,onSubmit}:{match:Match;question:string;onSubmit:(answer:string)=>Promise<void>}){const [answer,setAnswer]=useState('');const [loading,setLoading]=useState(false);const submit=async()=>{if(!answer||loading)return;setLoading(true);try{await onSubmit(answer)}finally{setLoading(false)}};return <FormPage><View style={{alignItems:'center',gap:12}}><Text style={styles.kicker}>YOUR FIRST MOMENT</Text><View style={styles.miniFaces}><Image source={{uri:match.photo}} style={styles.miniFace}/><View style={[styles.miniFace,{backgroundColor:'#3A1820',alignItems:'center',justifyContent:'center',marginLeft:-9}]}><Text style={styles.avatarText}>A</Text></View></View></View><SectionTitle title={question} body={`${match.name} is answering this too. No overthinking—just be you.`}/><View style={{gap:12}}>{['Coffee date — good conversation first','Road trip — let’s make a memory'].map(x=><Pressable disabled={loading} key={x} onPress={()=>setAnswer(x)} style={[styles.answer,answer===x&&styles.intentSelected,loading&&{opacity:.72}]}><Text style={styles.answerText}>{x}</Text><MiniPremiumIcon name={answer===x?'checkmark-circle':'ellipse-outline'} tone={answer===x?'gold':'dark'} size={34} iconSize={16}/></Pressable>)}</View><View style={styles.private}><MiniPremiumIcon name="lock-closed" tone="dark" size={28} iconSize={13}/><Text style={styles.helper}>Answers are revealed after you both respond. Production chat stays locked until then.</Text></View><View style={shared.spacer}/><Button disabled={!answer||loading} label={loading?'Saving answer…':'Send my answer'} onPress={()=>void submit()}/></FormPage>}

const chatGifUrls=[
  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif',
  'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
  'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
  'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
  'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif',
  'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif',
  'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif',
  'https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif',
  'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif',
  'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
  'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif',
  'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
  'https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif',
  'https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif',
  'https://media.giphy.com/media/OkJat1YNdoD3W/giphy.gif',
  'https://media.giphy.com/media/12XDYvMJNcmLgQ/giphy.gif',
  'https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif',
  'https://media.giphy.com/media/26tPplGWjN0xLybiU/giphy.gif',
  'https://media.giphy.com/media/3o7TKsQ8UQ4l4LhGz6/giphy.gif',
];
const gifMoodTitles=[
  'Good morning','Good night','Hello','Miss you','Thank you','Haha','LOL','Cute','Blushing','Heart eyes',
  'Coffee?','Road trip','Date night','Can’t wait','Good vibes','Proud of you','You got this','Awww','Big hug','High five',
  'Happy dance','Okay then','I agree','Thinking','Wow','Shy smile','Excited','Celebration','Sorry','Peace',
  'Namaste','Bollywood mood','Chai time','Foodie mood','Gym energy','Travel mood','Work win','Weekend vibe','Movie night','Rainy day',
  'Flowers','Sweet moment','Best reply','Typing fast','Too funny','Mind blown','Respect','Family first','Dream home','Future plans',
];
const chatGifs=Array.from({length:100},(_,index)=>({title:gifMoodTitles[index%gifMoodTitles.length]!,uri:chatGifUrls[index%chatGifUrls.length]!}));
const digitalGifts=[
  {name:'A Rose',emoji:'🌹',coins:40,caption:'A little romance'},
  {name:'Flowers',emoji:'💐',coins:80,caption:'Thinking of you'},
  {name:'Teddy',emoji:'🧸',coins:120,caption:'A warm hug'},
  {name:'Celebration',emoji:'🥂',coins:160,caption:'To new beginnings'},
  {name:'Golden Heart',emoji:'💛',coins:200,caption:'Something meaningful'},
  {name:'Promise',emoji:'💍',coins:300,caption:'For a special moment'},
];
const physicalGifts=[
  {id:'ruby-roses',name:'Ruby Rose Bouquet',emoji:'💐',priceCents:4900,caption:'Fresh red roses',eta:'Same day',photo:'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1600&q=90'},
  {id:'gelato-night',name:'Gelato Night',emoji:'🍨',priceCents:2600,caption:'Pick 3 premium flavors',eta:'45–75 min',photo:'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=1600&q=90'},
  {id:'chai-duo',name:'Chai & Coffee Duo',emoji:'☕',priceCents:2200,caption:'A cozy little break',eta:'45–75 min',photo:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=90'},
  {id:'artisan-chocolate',name:'Artisan Chocolates',emoji:'🍫',priceCents:3600,caption:'Handcrafted box of 12',eta:'Same day',photo:'https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=1600&q=90'},
  {id:'mini-cake',name:'Celebration Cake',emoji:'🎂',priceCents:4200,caption:'A sweet milestone',eta:'Next day',photo:'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1600&q=90'},
  {id:'orchid',name:'Mini Orchid',emoji:'🪴',priceCents:3900,caption:'Something that grows',eta:'1–2 days',photo:'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1600&q=90'},
  {id:'book-date',name:'Bookstore Surprise',emoji:'📚',priceCents:3200,caption:'A thoughtful new read',eta:'1–2 days',photo:'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1600&q=90'},
  {id:'self-care',name:'Self-care Box',emoji:'🧖🏽‍♀️',priceCents:5800,caption:'A calm evening in',eta:'1–2 days',photo:'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=90'},
  {id:'candle',name:'Velvet Candle',emoji:'🕯️',priceCents:3400,caption:'Warm amber & rose',eta:'Same day',photo:'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1600&q=90'},
  {id:'fruit',name:'Fresh Fruit Basket',emoji:'🍓',priceCents:4500,caption:'Bright and beautiful',eta:'Same day',photo:'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=1600&q=90'},
  {id:'card',name:'Handwritten Card',emoji:'💌',priceCents:1800,caption:'Your words, delivered',eta:'1–2 days',photo:'https://images.unsplash.com/photo-1516383740770-fbcc5ccbece0?auto=format&fit=crop&w=1600&q=90'},
  {id:'movie-night',name:'Movie Night Kit',emoji:'🍿',priceCents:4400,caption:'Snacks, soda and cozy vibes',eta:'Same day',photo:'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=1600&q=90'},
];
type DigitalGift=typeof digitalGifts[number];
type PhysicalGift=typeof physicalGifts[number];
function physicalGiftIcon(id:string):keyof typeof Ionicons.glyphMap{
  const map:Record<string,keyof typeof Ionicons.glyphMap>={
    'ruby-roses':'flower',
    'gelato-night':'restaurant',
    'chai-duo':'cafe',
    'artisan-chocolate':'heart',
    'mini-cake':'gift',
    orchid:'leaf',
    'book-date':'book',
    'self-care':'sparkles',
    candle:'flame',
    fruit:'restaurant',
    card:'mail',
    'movie-night':'film',
  };
  return map[id]??'gift';
}
function digitalGiftIcon(name:string):keyof typeof Ionicons.glyphMap{
  if(name.includes('Rose'))return 'flower';
  if(name.includes('Flowers'))return 'flower';
  if(name.includes('Teddy'))return 'happy';
  if(name.includes('Celebration'))return 'sparkles';
  if(name.includes('Heart'))return 'heart';
  if(name.includes('Promise'))return 'diamond';
  return 'gift';
}
const quickEmojis=[
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
  '😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','🙂‍↕️','😏','😒','🙂‍↔️','😞','😔','😟','😕',
  '🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰',
  '😥','😓','🤗','🤔','🫣','🤭','🫢','🫡','🤫','🫠','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮',
  '😲','🥱','😴','🤤','😪','😮‍💨','😵','😵‍💫','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿',
  '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍',
  '👎','✊','👊','🤛','🤜','👏','🙌','🫶','🫶🏽','🤲','🙏','✍️','💅','🤝','💪','🫵','🫂','👀','👁️','👄',
  '❤️','🩷','🧡','💛','💚','💙','🩵','💜','🤎','🖤','🩶','🤍','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖',
  '💘','💝','💟','💌','💋','💯','💢','💥','💫','💦','💨','🕳️','💬','👑','💍','💎','✨','⭐','🌟','🔥',
  '🌹','💐','🌷','🌸','🌺','🌻','🌼','🪷','🍀','☕','🫖','🍵','🍕','🍔','🍟','🌮','🍜','🍝','🍛','🍫',
  '🍰','🧁','🍦','🍿','🥂','🍷','🍹','🎂','🎉','🎊','🎁','🎈','🪩','🎵','🎶','🎬','📸','🚗','✈️','🏡',
  '🌍','🌙','☀️','🌧️','🌈','⚡','💃🏽','🕺','🏋️','🧘‍♀️','🐶','🐱','🐼','🦁','🦄','🦋','🐥','🐒','🙈','🙉','🙊',
];
const snapFilters=[
  {name:'Ruby Glow',color:'rgba(229,9,47,.24)'},
  {name:'Golden Hour',color:'rgba(212,175,55,.18)'},
  {name:'Noir',color:'rgba(0,0,0,.38)'},
  {name:'Rose Film',color:'rgba(255,110,128,.18)'},
  {name:'Cool Date',color:'rgba(61,94,180,.18)'},
  {name:'Velvet Crush',color:'rgba(128,0,32,.32)'},
  {name:'Bollywood Sparkle',color:'rgba(255,64,129,.22)'},
  {name:'Chai Warmth',color:'rgba(166,94,46,.22)'},
  {name:'Dream Home',color:'rgba(248,245,240,.13)'},
  {name:'Moonlit Date',color:'rgba(64,60,160,.25)'},
  {name:'Rose Petal',color:'rgba(255,80,115,.28)'},
  {name:'Cinema Night',color:'rgba(17,17,20,.48)'},
  {name:'Soft Blush',color:'rgba(255,174,188,.22)'},
  {name:'Royal Ruby',color:'rgba(180,0,42,.3)'},
  {name:'Shaadi Glow',color:'rgba(255,214,102,.2)'},
  {name:'Meme Pop',color:'rgba(0,255,180,.16)'},
  {name:'Funny Face',color:'rgba(255,255,255,.18)'},
  {name:'Desi Drama',color:'rgba(255,111,0,.20)'},
  {name:'Puppy Mood',color:'rgba(120,80,35,.18)'},
  {name:'Cartoon Crush',color:'rgba(80,200,255,.18)'},
  {name:'Retro VHS',color:'rgba(120,0,255,.16)'},
  {name:'Neon Club',color:'rgba(255,0,200,.22)'},
  {name:'Soft Focus',color:'rgba(255,230,210,.18)'},
  {name:'Laugh Track',color:'rgba(255,230,0,.16)'},
  {name:'Crown Mode',color:'rgba(212,175,55,.22)'},
];
const faceEmojiOptions=['😂','🤣','😎','👑','🥸','🤠','🤓','🤡','😈','👽','🤖','🦄','🐶','🐱','🐼','🦁','🐵','🙈','💘','😍','😘','🤭','😜','😇','🕶️','🎩','💃🏽','🪩','🔥','✨'];
const chatCoachSuggestions=[
  {label:'Warm question',message:(match:Match)=>`I liked your ${match.vibes[0]?.toLowerCase() ?? 'intentional'} energy. What does a great weekend look like for you?`},
  {label:'Date idea',message:(match:Match)=>`This may be early, but ${match.city.split(',')[0]} has some great cafés. Want to plan a simple public coffee sometime?`},
  {label:'Values check',message:(_:Match)=>'What is one value you would never compromise in a serious relationship?'},
  {label:'Family tone',message:(_:Match)=>'How do you like to balance family involvement with independence as a couple?'},
];
const coupleGames=[
  {title:'Two Truths & A Dream',icon:'sparkles' as const,color:'#A71D35',prompt:'Send two true facts and one dream you want to build. Your match guesses the dream.'},
  {title:'Coffee or Road Trip',icon:'cafe' as const,color:'#7A1FE0',prompt:'Choose fast: cozy coffee date ☕ or spontaneous road trip 🚗 — and explain why.'},
  {title:'Values Rank',icon:'diamond' as const,color:'#D4AF37',prompt:'Rank these for a future together: family, career, travel, home.'},
  {title:'Memory Builder',icon:'images' as const,color:'#B9293F',prompt:'Describe one perfect Sunday together in three lines.'},
];
const coupleThemes=[
  {name:'Ruby Velvet',accent:'#E5092F',soft:'rgba(229,9,47,.12)',panel:'#160308',bg:'#070001',border:'#7A1B31'},
  {name:'Champagne Night',accent:'#D4AF37',soft:'rgba(212,175,55,.13)',panel:'#151007',bg:'#050301',border:'#705A22'},
  {name:'Royal Plum',accent:'#8B5CF6',soft:'rgba(139,92,246,.13)',panel:'#12051C',bg:'#050108',border:'#4C1D95'},
  {name:'Moonlit Noir',accent:'#B9C6FF',soft:'rgba(185,198,255,.12)',panel:'#080A14',bg:'#02030A',border:'#29324F'},
  {name:'Rose Gold',accent:'#FF8A98',soft:'rgba(255,138,152,.13)',panel:'#1C0710',bg:'#070002',border:'#7A2534'},
  {name:'Emerald Promise',accent:'#50D890',soft:'rgba(80,216,144,.12)',panel:'#06170F',bg:'#010705',border:'#1B6B45'},
  {name:'Desert Chai',accent:'#D98B43',soft:'rgba(217,139,67,.13)',panel:'#180D05',bg:'#080401',border:'#7A4318'},
  {name:'Bollywood Glow',accent:'#FF3FB4',soft:'rgba(255,63,180,.13)',panel:'#190415',bg:'#070004',border:'#8A1B64'},
  {name:'Ocean Drive',accent:'#45C7FF',soft:'rgba(69,199,255,.12)',panel:'#04131B',bg:'#01070B',border:'#17617D'},
  {name:'Ivory Calm',accent:'#FFF0D2',soft:'rgba(255,240,210,.10)',panel:'#17110E',bg:'#070504',border:'#6D5A44'},
];

function Chat({experienceMode,initialTool,onToolConsumed,match,messages,reflection,reminder,settings,initialDraft,onDraftConsumed,onSettingsChange,onDateStatus,onReflection,onLearningConsent,onReminder,onJourneyEvent,coinBalance,roseAvailability,onRose,onSend,onSpendCoins,onReport,onBlock,onUnmatch,navigate}:{experienceMode:ExperienceMode;initialTool:CoupleLaunchTool;onToolConsumed:()=>void;match:Match;messages:ChatMessage[];reflection?:RelationshipReflectionRecord;reminder?:RelationshipReminderRecord;settings:CoupleChatSettings;initialDraft?:string;onDraftConsumed?:()=>void;onSettingsChange:(settings:CoupleChatSettings)=>void;onDateStatus:(messageId:string,status:DatePlanStatus)=>void;onReflection:(messageId:string,choice:RelationshipReflectionChoice|null)=>void;onLearningConsent:(enabled:boolean)=>void;onReminder:(messageId:string,enabled:boolean)=>void;onJourneyEvent:(name:RelationshipJourneyEventName,properties:Record<string,string|boolean>)=>void;coinBalance:number;roseAvailability:RoseAvailability;onRose:()=>void;onSend:(message:ChatMessage)=>Promise<boolean>;onSpendCoins:(coins:number)=>void;onReport:(reason:string,details?:string)=>void;onBlock:()=>void;onUnmatch:()=>void;navigate:(s:Screen)=>void}) {
  const {width:chatWidth}=useWindowDimensions();
  const messagesRef=useRef<ScrollView|null>(null);
  const [text,setText]=useState('');
  const [showAttachments,setShowAttachments]=useState(false);
  const [attachmentPage,setAttachmentPage]=useState<'main'|'more'>('main');
  const [showEmoji,setShowEmoji]=useState(false);
  const [showCoach,setShowCoach]=useState(false);
  const [gifOpen,setGifOpen]=useState(false);
  const [giftOpen,setGiftOpen]=useState(false);
  const [gamesOpen,setGamesOpen]=useState(false);
  const [snapOpen,setSnapOpen]=useState(false);
  const [faceEmojiOpen,setFaceEmojiOpen]=useState(false);
  const [callMode,setCallMode]=useState<'audio'|'video'|null>(null);
  const [chatError,setChatError]=useState('');
  const [optionsOpen,setOptionsOpen]=useState(false);
  const [safetyOpen,setSafetyOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const [searchQuery,setSearchQuery]=useState('');
  const [selectedMessageId,setSelectedMessageId]=useState<string|null>(null);
  const [replyTarget,setReplyTarget]=useState<ChatMessage|null>(null);
  const [messageReactions,setMessageReactions]=useState<Record<string,string>>({});
  const [starredMessages,setStarredMessages]=useState<string[]>([]);
  const [journeyOpen,setJourneyOpen]=useState(false);
  const [sending,setSending]=useState(false);
  const isCoupleMode=experienceMode==='couple';
  const recorder=useAudioRecorder(RecordingPresets.HIGH_QUALITY,(status)=>{
    if(status.hasError)setChatError(status.error??'Voice note failed. Please try again.');
  });
  const recorderState=useAudioRecorderState(recorder,200);
  useEffect(()=>{
    if(!initialDraft)return;
    setText(initialDraft);
    setShowAttachments(false);
    setShowEmoji(false);
    onDraftConsumed?.();
  },[initialDraft,onDraftConsumed]);
  useEffect(()=>{
    if(initialTool==='gift')setGiftOpen(true);
    if(initialTool==='games')setGamesOpen(true);
    if(initialTool)onToolConsumed();
  },[initialTool,onToolConsumed]);
  const createMessage=(message:Omit<ChatMessage,'id'|'createdAt'|'status'>):ChatMessage=>({...message,id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,createdAt:Date.now(),status:'read'});
  const messageSummary=(message:ChatMessage)=>message.text?.trim()||message.date?.venue||message.gift?.name||(message.type==='voice'?'Voice message':message.type==='location'?'Live location':message.type==='image'?'Photo':message.type==='gif'?'GIF':message.type==='snap'?'View-once photo':'Message');
  const dispatchMessage=async(message:ChatMessage)=>{
    setChatError('');
    const sent=await onSend(message);
    if(!sent)setChatError('Message was not confirmed. Check your connection and try again.');
    return sent;
  };
  const sendText=async()=>{const value=text.trim();if(!value||sending)return;const replyPrefix=replyTarget?`↩ ${messageSummary(replyTarget).slice(0,64)}\n`:'';setSending(true);try{if(await dispatchMessage(createMessage({type:'text',text:`${replyPrefix}${value}`}))){setText('');setReplyTarget(null);setShowEmoji(false)}}finally{setSending(false)}};
  const sendQuickShare=(textValue:string)=>{void dispatchMessage(createMessage({type:'text',text:textValue}));setShowAttachments(false);setAttachmentPage('main')};
  const startVoiceNote=async()=>{
    setChatError('');
    const permission=await requestRecordingPermissionsAsync();
    if(!permission.granted){setChatError('Microphone permission is needed to send a voice note.');return}
    await setAudioModeAsync({allowsRecording:true,playsInSilentMode:true});
    await recorder.prepareToRecordAsync();
    recorder.record({forDuration:120});
  };
  const stopVoiceNote=async()=>{
    await recorder.stop();
    await setAudioModeAsync({allowsRecording:false});
    if(recorder.uri){await dispatchMessage(createMessage({type:'voice',uri:recorder.uri,voice:{uri:recorder.uri,durationMs:recorderState.durationMillis}}))}
  };
  const sendOrRecord=()=>{if(text.trim()){void sendText();return} void (recorderState.isRecording?stopVoiceNote():startVoiceNote())};
  const shareLiveLocation=async()=>{
    setChatError('');
    const permission=await Location.requestForegroundPermissionsAsync();
    if(!permission.granted){setChatError('Location permission is needed to share live location.');return}
    try{
      const position=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
      const locationMessage=createMessage({type:'location',text:'Live location shared',location:{latitude:position.coords.latitude,longitude:position.coords.longitude,label:'Live location · tracking for 30 min',live:true,expiresAt:Date.now()+30*60*1000,accuracy:position.coords.accuracy??undefined}});
      await dispatchMessage(locationMessage);
      setShowAttachments(false);
    }catch{
      setChatError('Could not get your current location. Try again outdoors or check permission settings.');
    }
  };
  const sendPhoto=async()=>{
    setChatError('');
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){setChatError('Photo permission is needed to share an image.');return}
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:.8});
    if(!result.canceled&&result.assets[0]){await dispatchMessage(createMessage({type:'image',uri:result.assets[0].uri}));setShowAttachments(false)}
  };
  const sendCameraPhoto=async()=>{
    setChatError('');
    const permission=await ImagePicker.requestCameraPermissionsAsync();
    if(!permission.granted){setChatError('Camera permission is needed to take a photo.');return}
    const result=await ImagePicker.launchCameraAsync({mediaTypes:['images'],quality:.85,allowsEditing:true,aspect:[4,5]});
    if(!result.canceled&&result.assets[0]){await dispatchMessage(createMessage({type:'image',uri:result.assets[0].uri}));setShowAttachments(false)}
  };
  const sendGif=(uri:string)=>{void dispatchMessage(createMessage({type:'gif',uri}));setGifOpen(false);setShowAttachments(false)};
  const sendDigitalGift=(gift:DigitalGift)=>{
    if(digitalGiftWalletMode!=='demo'){setChatError('Digital gifts are unavailable until verified store billing and server wallet sync are active.');setGiftOpen(false);return}
    if(!canSendGift(coinBalance,gift.coins)){setChatError('Not enough coins. Secure wallet top-up will be enabled with production billing.');setGiftOpen(false);return}
    track('gift_sent',{gift:gift.name,coins:gift.coins});onSpendCoins(gift.coins);void dispatchMessage(createMessage({type:'gift',gift:{name:gift.name,emoji:gift.emoji,coins:gift.coins}}));setGiftOpen(false);setShowAttachments(false);
  };
  const sendPhysicalGift=async(gift:PhysicalGift,note:string)=>{
    const order=await createPhysicalGiftOrder({productId:gift.id,productName:gift.name,recipientId:match.id,recipientName:match.name,priceCents:gift.priceCents,etaHint:gift.eta,note});
    track('physical_gift_requested',{gift:gift.name,demo:order.demo});
    await dispatchMessage(createMessage({type:'gift',text:`${gift.name} requested · ${order.quote.etaLabel}`,gift:{name:gift.name,emoji:gift.emoji,priceCents:gift.priceCents,physical:true,orderId:order.orderId,deliveryStatus:order.deliveryStatus,etaLabel:order.quote.etaLabel,etaConfidence:order.quote.etaConfidence,provider:order.quote.providerLabel,quoteId:order.quote.quoteId,serviceLevel:order.quote.serviceLevelLabel,providerRecommendation:order.quote.providerRecommendation,paymentPolicy:order.quote.paymentPolicy,cancellationPolicy:order.quote.cancellationPolicy,supportPolicy:order.quote.supportPolicy,recipientPrivacy:order.quote.recipientPrivacy,acceptanceWindowMinutes:order.quote.acceptanceWindowMinutes,acceptanceExpiresAt:order.quote.acceptanceExpiresAt,trackingUrl:order.trackingUrl,totalCents:order.quote.totalCents,steps:order.steps}}));
    setGiftOpen(false);setShowAttachments(false);
  };
  const sendSnap=(uri:string,filter:string,sticker:string,viewOnce:boolean)=>{void dispatchMessage(createMessage({type:'snap',uri,snap:{filter,sticker,viewOnce,expiresAt:Date.now()+24*60*60*1000}}));setSnapOpen(false);setShowAttachments(false)};
  const sendFaceEmoji=(faceUri:string,emoji:string,filter:string)=>{void dispatchMessage(createMessage({type:'sticker',sticker:{faceUri,emoji,filter,label:'My face emoji'}}));setFaceEmojiOpen(false);setShowAttachments(false)};
  const startGame=(game:typeof coupleGames[number])=>{void dispatchMessage(createMessage({type:'text',text:`🎮 ${game.title}: ${game.prompt}`}));setGamesOpen(false);setShowAttachments(false)};
  const openAttachment=(id:string)=>{
    if(id==='date_market'){setShowAttachments(false);navigate('events');return}
    if(id==='camera'){void sendCameraPhoto();return}
    if(id==='gallery'){void sendPhoto();return}
    if(id==='location'){void shareLiveLocation();return}
    if(id==='document'){sendQuickShare('📄 Relationship values.pdf\nDocument · 1.8 MB · Shared securely');return}
    if(id==='more'){setAttachmentPage('more');return}
    if(id==='contact'){sendQuickShare(`👤 Trusted contact card\n${match.name} · DestinyOne verified match`);return}
    if(id==='poll'){sendQuickShare('📊 Which date feels best?\n☕ Café   🍽️ Dinner   🎨 Activity');return}
    if(id==='gif'){setGifOpen(true);return}
    if(id==='gift'){setGiftOpen(true);return}
    if(id==='games'){setGamesOpen(true);return}
    if(id==='snap'){setSnapOpen(true);return}
    if(id==='face'){setFaceEmojiOpen(true);return}
    if(id==='spark'){setShowAttachments(false);onRose();return}
    if(id==='disappearing'){onSettingsChange({...settings,retentionMode:settings.retentionMode==='keep'?'24_hours':'keep'});setShowAttachments(false);return}
    if(id==='back')setAttachmentPage('main');
  };
  const activeTheme=coupleThemes.find(theme=>theme.name===settings.theme)??coupleThemes[0]!;
  const disappearingMessages=settings.retentionMode!=='keep';
  const retentionShort=settings.retentionMode==='after_seen'?'After seen':settings.retentionMode==='24_hours'?'24h':settings.retentionMode==='7_days'?'7d':'Keep';
  const displayName=settings.nickname.trim()||match.name;
  const messageSafety=scanMessageSafety(text);
  const normalizedSearch=searchQuery.trim().toLowerCase();
  const visibleMessages=normalizedSearch?messages.filter(message=>messageSummary(message).toLowerCase().includes(normalizedSearch)):messages;
  const latestDateMessage=[...messages].reverse().find(message=>message.type==='date'&&message.date);
  const selectMessage=(message:ChatMessage)=>setSelectedMessageId(current=>current===message.id?null:message.id);
  const reactToMessage=(messageId:string,reaction:string)=>{setMessageReactions(current=>({...current,[messageId]:reaction}));setSelectedMessageId(null)};
  const toggleStar=(messageId:string)=>{setStarredMessages(current=>current.includes(messageId)?current.filter(id=>id!==messageId):[...current,messageId]);setSelectedMessageId(null)};
  return <LinearGradient colors={[activeTheme.bg,colors.black,activeTheme.bg]} style={{flex:1}}><SafeAreaView style={chatPremiumStyles.safeArea}>
    <View style={[styles.chatHead,chatPremiumStyles.chatHead,{backgroundColor:'rgba(14,3,7,.96)',borderBottomColor:'rgba(255,255,255,.07)'}]}>
      <Pressable accessibilityRole="button" accessibilityLabel={isCoupleMode?'Back to our space':'Back to matches'} onPress={()=>navigate('home')}><PremiumIcon name="arrow-back" tone="dark" size={35} iconSize={17}/></Pressable>
      {match.photo?<Image source={{uri:match.photo}} style={[styles.chatAvatar,chatPremiumStyles.chatAvatar,{borderWidth:1,borderColor:activeTheme.accent}]}/>:<View style={[styles.chatAvatar,chatPremiumStyles.chatAvatar,chatStyles.initialAvatar,{borderColor:activeTheme.accent}]}><Text style={chatStyles.initialAvatarText}>{match.name[0]?.toUpperCase()}</Text></View>}
      <View style={{flex:1}}><Text numberOfLines={1} style={shared.label}>{displayName}</Text><View style={chatStyles.onlineRow}><View style={[chatStyles.onlineDot,{backgroundColor:memberDataRuntime.source==='preview'?activeTheme.accent:colors.muted}]}/><Text style={styles.onlineText}>{isCoupleMode?'Private couple space':memberDataRuntime.source==='preview'?(settings.nickname.trim()?`${match.name} · Online`:'Online'):'Private conversation'}</Text></View></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Audio call" hitSlop={8} onPress={()=>setCallMode('audio')} style={chatStyles.headerAction}><Ionicons name="call-outline" size={20} color={colors.ivory}/></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Video call" hitSlop={8} onPress={()=>setCallMode('video')} style={chatStyles.headerAction}><Ionicons name="videocam-outline" size={21} color={colors.ivory}/></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Chat options" hitSlop={8} onPress={()=>setOptionsOpen(true)} style={chatStyles.headerAction}><Ionicons name="ellipsis-vertical" size={20} color={colors.muted}/></Pressable>
    </View>
    {searchOpen&&<View style={chatStyles.searchBar}><Ionicons name="search-outline" size={18} color={colors.muted}/><TextInput accessibilityLabel="Search this conversation" autoFocus value={searchQuery} onChangeText={setSearchQuery} placeholder="Search this conversation" placeholderTextColor="#806D7D" style={chatStyles.searchInput}/><Text style={chatStyles.searchCount}>{normalizedSearch?`${visibleMessages.length} found`:''}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close message search" onPress={()=>{setSearchOpen(false);setSearchQuery('')}}><Ionicons name="close" size={20} color={colors.muted}/></Pressable></View>}
    <View style={chatStyles.contextBar}><Pressable accessibilityRole="button" accessibilityLabel={isCoupleMode?'Open our couple space':'Open relationship path'} onPress={()=>{if(isCoupleMode){navigate('home');return}const dateStatus=latestDateMessage?.date?.planStatus??(latestDateMessage?'proposed':'none');const journey=buildRelationshipJourney({alignmentComplete:true,conversationUnlocked:true,dateStatus,reflection:reflection?.choice??null});onJourneyEvent('relationship_path_opened',{stage:journey.currentStage?.id??'complete'});setJourneyOpen(true)}} style={chatStyles.privateContext}><Ionicons name="heart-circle-outline" size={14} color={colors.gold}/><Text style={chatStyles.privateContextText}>{isCoupleMode?'Our space':disappearingMessages?`${retentionShort} · Path`:'Relationship path'}</Text></Pressable><View style={shared.spacer}/><Pressable accessibilityRole="button" accessibilityLabel="Open Date Marketplace" onPress={()=>navigate('events')} style={chatStyles.contextAction}><Ionicons name="calendar-outline" size={14} color={colors.gold}/><Text style={chatStyles.contextActionText}>Date</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Reply coach" onPress={()=>setShowCoach(value=>!value)} style={[chatStyles.contextAction,showCoach&&chatStyles.contextActionOn]}><Ionicons name="sparkles-outline" size={14} color={showCoach?colors.gold:colors.muted}/><Text style={chatStyles.contextActionText}>Coach</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Search messages" onPress={()=>{setSearchOpen(value=>!value);setSearchQuery('')}} style={chatStyles.contextIcon}><Ionicons name="search-outline" size={17} color={colors.muted}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Chat settings" onPress={()=>setSettingsOpen(true)} style={chatStyles.contextIcon}><Ionicons name="settings-outline" size={17} color={colors.muted}/></Pressable></View>
    {showCoach&&<View style={[coachStyles.chatCoach,chatStyles.coachPanel]}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:7}}>{chatCoachSuggestions.map(item=><Pressable key={item.label} onPress={()=>{setText(item.message(match));setShowCoach(false)}} style={[coachStyles.suggestionChip,{borderColor:'rgba(255,255,255,.10)',backgroundColor:'rgba(255,255,255,.045)'}]}><Text style={coachStyles.suggestionText}>{item.label}</Text></Pressable>)}</ScrollView><Pressable onPress={()=>navigate('coach')} style={chatStyles.coachOpen}><Text style={chatStyles.coachOpenText}>Open coach</Text></Pressable></View>}
    {!!chatError&&<Pressable onPress={()=>setChatError('')} style={chatStyles.errorBanner}><Text style={chatStyles.errorText}>{chatError}</Text><MiniPremiumIcon name="close" tone="dark" size={28} iconSize={13}/></Pressable>}
    <ScrollView ref={messagesRef} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'} onContentSizeChange={()=>messagesRef.current?.scrollToEnd({animated:true})} contentContainerStyle={[styles.messages,chatPremiumStyles.messages]}>
      {!isCoupleMode&&memberDataRuntime.source==='preview'&&<><View style={styles.iceReveal}><Text style={styles.kicker}>ICEBREAKER REVEALED</Text><Text style={styles.revealText}>You both chose: <Text style={{color:colors.ivory}}>Road trip 🚗</Text></Text></View><Text style={chatStyles.dayLabel}>TODAY</Text><View style={[styles.theirBubble,chatPremiumStyles.theirBubble]}><Text style={styles.bubbleText}>Okay, excellent choice. Mountains or coast? 😊</Text><Text style={styles.time}>7:42 PM</Text></View></>}
      {visibleMessages.map(message=><View key={message.id} style={chatStyles.messageGroup}>
        <ChatBubble message={message} accent={activeTheme.accent} reaction={messageReactions[message.id]} starred={starredMessages.includes(message.id)} onPress={()=>selectMessage(message)}/>
        {selectedMessageId===message.id&&<View style={chatStyles.messageActions}>
          {['❤️','👍','😂','😮','🙏'].map(reaction=><Pressable accessibilityRole="button" accessibilityLabel={`React ${reaction}`} key={reaction} onPress={()=>reactToMessage(message.id,reaction)} style={chatStyles.reactionButton}><Text style={chatStyles.reactionText}>{reaction}</Text></Pressable>)}
          <Pressable accessibilityRole="button" accessibilityLabel="Reply to message" onPress={()=>{setReplyTarget(message);setSelectedMessageId(null)}} style={chatStyles.messageActionIcon}><Ionicons name="arrow-undo-outline" size={17} color={colors.ivory}/></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={starredMessages.includes(message.id)?'Unstar message':'Star message'} onPress={()=>toggleStar(message.id)} style={chatStyles.messageActionIcon}><Ionicons name={starredMessages.includes(message.id)?'star':'star-outline'} size={17} color={colors.gold}/></Pressable>
        </View>}
      </View>)}
      {!!normalizedSearch&&!visibleMessages.length&&<View style={chatStyles.emptySearch}><Ionicons name="search-outline" size={24} color={colors.muted}/><Text style={chatStyles.emptySearchText}>No messages match “{searchQuery}”.</Text></View>}
      {!isCoupleMode&&memberDataRuntime.source==='preview'&&<View style={chatStyles.typingBubble}><View style={chatStyles.typingDot}/><View style={chatStyles.typingDot}/><View style={chatStyles.typingDot}/></View>}
    </ScrollView>
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':Platform.OS==='android'?'height':undefined} style={chatStyles.keyboardWrap}>
      {!!text.trim()&&messageSafety.signals.length>0&&(
        <SafetyNudge scan={messageSafety} onOpenSafety={()=>navigate('safety')}/>
      )}
      {showAttachments&&<View style={[chatStyles.attachmentTray,chatWidth>=600&&chatStyles.attachmentTrayWide]}>
        {(attachmentPage==='main'?chatPrimaryAttachments:chatMoreAttachments).filter(item=>!isCoupleMode||item.id!=='spark').map(item=><Attachment key={item.id} icon={item.icon as keyof typeof Ionicons.glyphMap} label={item.id==='disappearing'?(disappearingMessages?`${retentionShort} On`:'Timer Off'):item.label} color={item.color} onPress={()=>openAttachment(item.id)}/>) }
      </View>}
      {showEmoji&&<View style={chatStyles.emojiPanel}><View style={chatStyles.emojiHeader}><Text style={chatStyles.emojiTitle}>Emojis</Text><Text style={chatStyles.emojiCount}>{quickEmojis.length} daily-use</Text></View><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={chatStyles.emojiTray}>{quickEmojis.map((emoji,index)=><Pressable key={`${emoji}-${index}`} style={chatStyles.emojiButton} onPress={()=>setText(value=>value+emoji)}><Text style={chatStyles.emoji}>{emoji}</Text></Pressable>)}</ScrollView></View>}
      {replyTarget&&<View style={chatStyles.replyPreview}><View style={chatStyles.replyAccent}/><View style={{flex:1}}><Text style={chatStyles.replyTitle}>Replying to your message</Text><Text numberOfLines={1} style={chatStyles.replyText}>{messageSummary(replyTarget)}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Cancel reply" onPress={()=>setReplyTarget(null)}><Ionicons name="close" size={20} color={colors.muted}/></Pressable></View>}
      <View style={[styles.composer,chatPremiumStyles.composer]}><Pressable accessibilityRole="button" accessibilityLabel={showAttachments?'Close attachments':'Add attachment'} onPress={()=>{setShowAttachments(value=>{if(!value)setAttachmentPage('main');return !value});setShowEmoji(false)}}><PremiumIcon name={showAttachments?'close':'add-circle-outline'} tone={showAttachments?'ruby':'dark'} size={36} iconSize={17}/></Pressable><View style={[chatStyles.inputWrap,{backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:recorderState.isRecording?colors.gold:'rgba(255,255,255,.10)'}]}><TextInput value={text} onChangeText={setText} onSubmitEditing={() => void sendText()} returnKeyType="send" placeholder={sending?'Sending…':recorderState.isRecording?'Recording voice note…':'Message…'} placeholderTextColor="#8C7888" editable={!recorderState.isRecording&&!sending} style={[styles.chatInput,chatPremiumStyles.chatInput]}/><Pressable accessibilityRole="button" accessibilityLabel={showEmoji?'Close emoji picker':'Open emoji picker'} onPress={()=>{setShowEmoji(value=>!value);setShowAttachments(false)}}><Ionicons name={showEmoji?'close':'happy-outline'} size={21} color={showEmoji?colors.gold:'#B59DA4'}/></Pressable></View><Pressable disabled={sending} accessibilityRole="button" accessibilityLabel={sending?'Sending message':text.trim()?'Send message':recorderState.isRecording?'Stop recording':'Record voice note'} onPress={sendOrRecord} style={chatStyles.sendButton}><Ionicons name={sending?'time-outline':text.trim()?'send':recorderState.isRecording?'stop':'mic'} size={20} color={colors.ivory}/></Pressable></View>
    </KeyboardAvoidingView>
    <BottomNav active="chat" mode={experienceMode} onOpenTool={(tool)=>tool==='gift'?setGiftOpen(true):setGamesOpen(true)} navigate={navigate}/>
    <GifPicker visible={gifOpen} onClose={()=>setGifOpen(false)} onSelect={sendGif}/>
    <GiftShop visible={giftOpen} balance={coinBalance} recipientName={match.name} physicalMode={physicalGiftOrderingMode} digitalMode={digitalGiftWalletMode} onClose={()=>setGiftOpen(false)} onSendDigital={sendDigitalGift} onOrderPhysical={sendPhysicalGift}/>
    <GameSheet visible={gamesOpen} onClose={()=>setGamesOpen(false)} onPlay={startGame}/>
    <SnapStudio visible={snapOpen} onClose={()=>setSnapOpen(false)} onSend={sendSnap}/>
    <FaceEmojiStudio visible={faceEmojiOpen} onClose={()=>setFaceEmojiOpen(false)} onSend={sendFaceEmoji}/>
    <CallModal mode={callMode} match={match} isCoupleMode={isCoupleMode} onClose={()=>setCallMode(null)}/>
    <CoupleSettingsSheet visible={settingsOpen} match={match} settings={settings} onChange={onSettingsChange} onClose={()=>setSettingsOpen(false)}/>
    <ChatOptionsSheet visible={optionsOpen} retentionLabel={retentionShort} screenshotAlerts={settings.screenshotAlerts} onClose={()=>setOptionsOpen(false)} onSearch={()=>{setOptionsOpen(false);setSearchOpen(true);setSearchQuery('')}} onDate={()=>{setOptionsOpen(false);navigate('events')}} onSettings={()=>{setOptionsOpen(false);setSettingsOpen(true)}} onSafety={()=>{setOptionsOpen(false);setSafetyOpen(true)}}/>
    <SafetyActions mode={experienceMode} visible={safetyOpen} match={match} onClose={()=>setSafetyOpen(false)} onSafetyCenter={()=>{setSafetyOpen(false);navigate('safety')}} onReport={(reason,details)=>{onReport(reason,details);setSafetyOpen(false)}} onBlock={()=>{setSafetyOpen(false);onBlock()}} onUnmatch={()=>{setSafetyOpen(false);onUnmatch()}}/>
    {!isCoupleMode&&<RelationshipJourneySheet visible={journeyOpen} match={match} dateMessage={latestDateMessage} reflection={reflection?.choice??null} useForMatching={reflection?.useForMatching??false} reminderEnabled={reminder?.enabled??false} onDateStatus={(status)=>{if(latestDateMessage)onDateStatus(latestDateMessage.id,status)}} onReflection={(choice)=>{if(latestDateMessage)onReflection(latestDateMessage.id,choice)}} onLearningConsent={onLearningConsent} onReminder={(enabled)=>{if(latestDateMessage)onReminder(latestDateMessage.id,enabled)}} onRespectfulClose={()=>{setJourneyOpen(false);setSafetyOpen(true)}} onClose={()=>setJourneyOpen(false)} onDate={()=>{setJourneyOpen(false);navigate('events')}} onCircle={()=>{setJourneyOpen(false);navigate('circle')}}/>}
  </SafeAreaView></LinearGradient>
}

function RelationshipJourneySheet({visible,match,dateMessage,reflection,useForMatching,reminderEnabled,onDateStatus,onReflection,onLearningConsent,onReminder,onRespectfulClose,onClose,onDate,onCircle}:{visible:boolean;match:Match;dateMessage?:ChatMessage;reflection:RelationshipReflection;useForMatching:boolean;reminderEnabled:boolean;onDateStatus:(status:DatePlanStatus)=>void;onReflection:(value:RelationshipReflection)=>void;onLearningConsent:(enabled:boolean)=>void;onReminder:(enabled:boolean)=>void;onRespectfulClose:()=>void;onClose:()=>void;onDate:()=>void;onCircle:()=>void}){
  const dateStatus=dateMessage?.date?.planStatus??(dateMessage?'proposed':'none');
  const journey=buildRelationshipJourney({alignmentComplete:true,conversationUnlocked:true,dateStatus,reflection});
  const learning=buildRelationshipLearningState({dateStatus,reflection,useForMatching,reminderEnabled});
  const reflectionOptions:Array<{value:Exclude<RelationshipReflection,null>;label:string;body:string;icon:keyof typeof Ionicons.glyphMap}>=[
    {value:'continue',label:'Worth exploring',body:'I felt safe and would like another date.',icon:'heart'},
    {value:'pause',label:'I need more time',body:'Keep the connection open without pressure.',icon:'time'},
    {value:'close',label:'Not for me',body:'Privately close the journey and improve future suggestions.',icon:'close-circle'},
  ];
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={chatStyles.modalBackdrop} onPress={onClose}/>
    <SafeAreaView style={[chatStyles.sheet,journeyStyles.sheet]}>
      <SheetHeader title="Your relationship path" subtitle={`A private journey with ${match.name}`} onClose={onClose}/>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={journeyStyles.content}>
        <View style={journeyStyles.progressCard}>
          <View style={shared.row}><View style={{flex:1}}><Text style={styles.kicker}>INTENT TO RELATIONSHIP</Text><Text style={journeyStyles.progressTitle}>{journey.currentStage?.title??'Journey complete'}</Text></View><Text style={journeyStyles.progressPercent}>{journey.progressPercent}%</Text></View>
          <View style={journeyStyles.track}><View style={[journeyStyles.fill,{width:`${journey.progressPercent}%`}]}/></View>
          <Text style={styles.helper}>No public compatibility score. Each step opens only through mutual actions.</Text>
        </View>
        <View style={journeyStyles.stageList}>{journey.stages.map((stage,index)=><View key={stage.id} style={[journeyStyles.stage,stage.status==='current'&&journeyStyles.stageCurrent]}><View style={[journeyStyles.stageIcon,stage.status==='complete'&&journeyStyles.stageIconDone]}><Ionicons name={stage.status==='complete'?'checkmark':stage.status==='current'?'heart':'lock-closed'} size={15} color={stage.status==='locked'?colors.muted:colors.ivory}/></View><View style={{flex:1}}><Text style={[journeyStyles.stageTitle,stage.status==='locked'&&{color:colors.muted}]}>{index+1}. {stage.title}</Text><Text style={journeyStyles.stageBody}>{stage.body}</Text></View><Text style={journeyStyles.stageStatus}>{stage.status==='complete'?'DONE':stage.status==='current'?'NOW':'LATER'}</Text></View>)}</View>
        {dateStatus==='none'&&<View style={journeyStyles.actionCard}><PremiumIcon name="calendar" tone="gold" size={46} iconSize={21}/><View style={{flex:1}}><Text style={styles.cardTitle}>Ready for a thoughtful first date?</Text><Text style={styles.helper}>Choose a public place, agree on a time and keep safety check-in on.</Text></View></View>}
        {dateStatus==='none'&&<Button label="Plan a safe date" icon="calendar" onPress={onDate}/>} 
        {(dateStatus==='proposed'||dateStatus==='countered')&&<View style={journeyStyles.responseCard}><View style={shared.row}><MiniPremiumIcon name="time" tone="gold" size={34} iconSize={16}/><View style={{flex:1}}><Text style={journeyStyles.reflectionTitle}>{dateStatus==='countered'?'A change was suggested':'Waiting for mutual confirmation'}</Text><Text style={journeyStyles.reflectionBody}>{dateMessage?.date?.venue} · {dateMessage?.date?.time}</Text></View></View><Text style={styles.helper}>In production, only the recipient can respond. These controls keep the mock journey testable.</Text><View style={journeyStyles.responseActions}><Button label="Accept plan" icon="checkmark-circle" onPress={()=>onDateStatus('accepted')}/><Button label="Suggest change" variant="secondary" onPress={()=>onDateStatus('countered')}/><Button label="Decline kindly" variant="ghost" onPress={()=>onDateStatus('declined')}/></View></View>}
        {dateStatus==='accepted'&&<View style={journeyStyles.responseCard}><View style={journeyStyles.acceptedRow}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={38} iconSize={18}/><View style={{flex:1}}><Text style={journeyStyles.reflectionTitle}>Date plan accepted</Text><Text style={journeyStyles.reflectionBody}>Reflection stays locked until the date has happened.</Text></View></View><Pressable accessibilityRole="switch" accessibilityState={{checked:learning.reminderActive}} accessibilityLabel="Private date reminder" onPress={()=>onReminder(!reminderEnabled)} style={journeyStyles.consentRow}><MiniPremiumIcon name="notifications-outline" tone={learning.reminderActive?'gold':'dark'} size={34} iconSize={16}/><View style={{flex:1}}><Text style={journeyStyles.reflectionTitle}>Private date reminder</Text><Text style={journeyStyles.reflectionBody}>Remind only me before the plan, with no partner name or message preview.</Text></View><View style={[discoveryStyles.switch,learning.reminderActive&&discoveryStyles.switchOn]}><View style={[discoveryStyles.switchThumb,learning.reminderActive&&discoveryStyles.switchThumbOn]}/></View></Pressable><Button label="The date happened" icon="heart-circle" onPress={()=>onDateStatus('completed')}/></View>}
        {dateStatus==='declined'&&<View style={journeyStyles.responseCard}><View style={shared.row}><MiniPremiumIcon name="heart-dislike-outline" tone="rose" size={36} iconSize={17}/><View style={{flex:1}}><Text style={journeyStyles.reflectionTitle}>This plan was declined</Text><Text style={journeyStyles.reflectionBody}>No pressure. Suggest a different plan or review respectful close options.</Text></View></View><Button label="Plan something different" icon="calendar" onPress={onDate}/><Button label="Review close options" variant="secondary" onPress={onRespectfulClose}/></View>}
        {dateStatus==='completed'&&!reflection&&<View style={journeyStyles.reflectionBlock}><Text style={styles.sectionLabel}>PRIVATE POST-DATE REFLECTION</Text><Text style={styles.helper}>Only you see this answer. It is never sent to {match.name}.</Text>{reflectionOptions.map(option=><Pressable accessibilityRole="button" accessibilityLabel={option.label} key={option.value} onPress={()=>onReflection(option.value)} style={journeyStyles.reflectionOption}><MiniPremiumIcon name={option.icon} tone={option.value==='continue'?'gold':option.value==='pause'?'rose':'dark'} size={34} iconSize={16}/><View style={{flex:1}}><Text style={journeyStyles.reflectionTitle}>{option.label}</Text><Text style={journeyStyles.reflectionBody}>{option.body}</Text></View></Pressable>)}</View>}
        {!!reflection&&<View style={journeyStyles.savedReflection}><MiniPremiumIcon name="lock-closed" tone="gold" size={34} iconSize={16}/><View style={{flex:1}}><Text style={journeyStyles.reflectionTitle}>Reflection saved privately</Text><Text style={journeyStyles.reflectionBody}>{reflection==='continue'?'Trusted Circle is now available when you both feel ready.':reflection==='pause'?'The connection stays open without adding pressure.':'This preview keeps the answer private; production will offer a respectful close flow.'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Change reflection" onPress={()=>onReflection(null)}><Text style={discoveryStyles.manageText}>Change</Text></Pressable></View>}
        {!!reflection&&<Pressable accessibilityRole="switch" accessibilityState={{checked:learning.canUseForMatching}} accessibilityLabel="Improve future matches from this reflection" onPress={()=>onLearningConsent(!useForMatching)} style={[journeyStyles.consentRow,learning.canUseForMatching&&journeyStyles.consentRowOn]}><MiniPremiumIcon name="options-outline" tone={learning.canUseForMatching?'gold':'dark'} size={36} iconSize={17}/><View style={{flex:1}}><Text style={journeyStyles.reflectionTitle}>Improve my future matches</Text><Text style={journeyStyles.reflectionBody}>{learning.canUseForMatching?'Only this private answer becomes a broad matching signal. You can revoke it anytime.':`Off by default. Your answer stays private and is not used to rank ${match.name} or anyone else.`}</Text></View><View style={[discoveryStyles.switch,learning.canUseForMatching&&discoveryStyles.switchOn]}><View style={[discoveryStyles.switchThumb,learning.canUseForMatching&&discoveryStyles.switchThumbOn]}/></View></Pressable>}
        {journey.trustedCircleReady&&<Button label="Open Trusted Circle" icon="people" variant="gold" onPress={onCircle}/>} 
        {reflection==='close'&&<Button label="Review respectful close options" icon="heart-dislike-outline" variant="secondary" onPress={onRespectfulClose}/>} 
        <Text style={styles.legal}>Relationship Path is guidance, not a guarantee or compatibility score. Safety tools remain available at every stage.</Text>
      </ScrollView>
    </SafeAreaView>
  </Modal>
}

function giftStatusLabel(status?: NonNullable<ChatMessage['gift']>['deliveryStatus']){
  const labels:Record<string,string>={
    requested:'REQUEST CREATED',
    recipient_pending:'WAITING FOR RECIPIENT TO ACCEPT',
    recipient_accepted:'RECIPIENT ACCEPTED PRIVATELY',
    payment_authorized:'PAYMENT AUTHORIZED',
    merchant_preparing:'PARTNER PREPARING',
    courier_assigned:'COURIER ASSIGNED',
    picked_up:'OUT FOR DELIVERY',
    delivered:'DELIVERED',
    cancelled:'CANCELLED',
    failed:'NEEDS SUPPORT',
  };
  return labels[status??'recipient_pending']??'GIFT ORDER UPDATED';
}

function ChatBubble({message,accent,reaction,starred,onPress}:{message:ChatMessage;accent?:string;reaction?:string;starred?:boolean;onPress?:()=>void}){return <Pressable accessibilityRole="button" accessibilityLabel={`Message: ${message.text?.slice(0,50)||message.date?.venue||message.gift?.name||message.type}`} onPress={onPress} style={[styles.myBubble,message.type==='text'&&accent?{backgroundColor:'rgba(145,12,35,.94)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',maxWidth:'74%',padding:12}:null,(message.type==='image'||message.type==='gif'||message.type==='snap')&&chatStyles.mediaBubble,message.type==='gift'&&chatStyles.giftBubble,message.type==='sticker'&&chatStyles.stickerBubble,message.type==='date'&&dateStyles.dateBubble,message.type==='voice'&&chatStyles.voiceBubble,message.type==='location'&&chatStyles.locationBubble]}>
  {message.type==='text'&&<Text style={styles.bubbleText}>{message.text}</Text>}
  {(message.type==='image'||message.type==='gif'||message.type==='snap')&&message.uri&&<Image source={{uri:message.uri}} style={chatStyles.messageMedia}/>} 
  {message.type==='gif'&&<View style={chatStyles.gifBadge}><Text style={chatStyles.gifBadgeText}>GIF</Text></View>}
  {message.type==='snap'&&message.snap&&<><View style={[StyleSheet.absoluteFill,{backgroundColor:snapFilters.find(item=>item.name===message.snap?.filter)?.color??'transparent'}]}/>{!!message.snap.sticker&&<Text style={chatStyles.snapSticker}>{message.snap.sticker}</Text>}<View style={chatStyles.snapBadge}><MiniPremiumIcon name={message.snap.viewOnce?'eye-off':'time'} tone="dark" size={22} iconSize={10}/><Text style={chatStyles.snapBadgeText}>{message.snap.viewOnce?'VIEW ONCE':'24H SNAP'} · {message.snap.filter}</Text></View></>}
  {message.type==='sticker'&&message.sticker&&<><View style={stickerStyles.faceStickerFrame}><Image source={{uri:message.sticker.faceUri}} style={chatStyles.faceStickerImage}/><View style={[StyleSheet.absoluteFill,{backgroundColor:snapFilters.find(item=>item.name===message.sticker?.filter)?.color??'transparent'}]}/></View><Text style={chatStyles.faceStickerEmoji}>{message.sticker.emoji}</Text><Text style={chatStyles.giftCaption}>{message.sticker.filter??'Made by me'}</Text></>}
  {message.type==='gift'&&message.gift&&<>{message.gift.physical&&message.gift.name.includes('Rose')?<RoseMark size={62}/>:<PremiumIcon name={message.gift.physical?'gift':'sparkles'} tone="gold" size={62} iconSize={29}/>}<Text style={chatStyles.giftTitle}>{message.gift.name}</Text><Text style={chatStyles.giftCaption}>{message.text??(message.gift.physical?'Delivery request sent · address stays private':'A digital gift sent with intention')}</Text>{message.gift.physical&&<View style={chatStyles.orderStatus}><View style={chatStyles.orderDot}/><Text style={chatStyles.orderStatusText}>{giftStatusLabel(message.gift.deliveryStatus)}</Text></View>}</>}
  {message.type==='gift'&&message.gift?.physical&&message.gift.steps&&<GiftTrackingMini gift={message.gift}/>}
  {message.type==='date'&&message.date&&<><View style={dateStyles.messageDateHeader}><PremiumIcon name="calendar" tone="gold" size={42} iconSize={19}/><View><Text style={dateStyles.messageEyebrow}>{message.date.packageTitle??'DATE IDEA'}</Text><Text style={dateStyles.messageVenue}>{message.date.venue}</Text>{message.date.packageTier&&<Text style={dateStyles.messagePackageTier}>{message.date.packageTier}</Text>}</View></View><View style={dateStyles.messageDivider}/><View style={dateStyles.messageLine}><MiniPremiumIcon name="location-outline" tone="rose" size={28} iconSize={13}/><Text style={dateStyles.messageLineText}>{message.date.area}</Text></View><View style={dateStyles.messageLine}><MiniPremiumIcon name="time-outline" tone="rose" size={28} iconSize={13}/><Text style={dateStyles.messageLineText}>{message.date.time}</Text></View>{message.date.safetyCheckIn&&<View style={dateStyles.safePill}><MiniPremiumIcon name="shield-checkmark" tone="gold" size={24} iconSize={11}/><Text style={dateStyles.safePillText}>Safety check-in enabled</Text></View>}<DatePlanStatusMini safetyCheckIn={!!message.date.safetyCheckIn} status={message.date.planStatus}/><Text style={dateStyles.waitingText}>{datePlanStatusLabel(message.date.planStatus??'proposed')}</Text></>}
  {message.type==='voice'&&message.uri&&<VoiceNote uri={message.uri} durationMs={message.voice?.durationMs??0}/>}
  {message.type==='location'&&message.location&&<LiveLocationCard location={message.location}/>}
  <View style={chatStyles.messageMeta}>{starred&&<Ionicons name="star" size={10} color={colors.gold}/>}<Text style={styles.time}>Now</Text><Ionicons name="checkmark-done" size={14} color="#75B9FF"/></View>
  {!!reaction&&<View style={chatStyles.reactionPill}><Text style={chatStyles.reactionText}>{reaction}</Text></View>}
</Pressable>}

function datePlanStatusLabel(status:DatePlanStatus){
  return status==='accepted'?'Plan accepted':status==='completed'?'Date completed':status==='declined'?'Plan declined':status==='countered'?'Change suggested':'Waiting for a response';
}

function DatePlanStatusMini({safetyCheckIn,status='proposed'}:{safetyCheckIn:boolean;status?:DatePlanStatus}){
  const steps=[['sent','Suggested'],['pending','Accept'],['reserve','Reserve'],[safetyCheckIn?'safe':'meet',safetyCheckIn?'Check-in':'Meet']] as const;
  const completedSteps=status==='completed'?4:status==='accepted'?2:1;
  return <View style={dateStyles.dateFlow}>{steps.map((step,index)=><View key={step[0]} style={dateStyles.dateFlowItem}><View style={[dateStyles.dateFlowDot,index<completedSteps&&dateStyles.dateFlowDotDone]}/><Text style={[dateStyles.dateFlowText,index<completedSteps&&dateStyles.dateFlowTextOn]}>{step[1]}</Text></View>)}</View>
}

function GiftTrackingMini({gift}:{gift:NonNullable<ChatMessage['gift']>}){
  const [trackingNotice,setTrackingNotice]=useState('');
  const steps=gift.steps??[];
  const openTracking=()=>{setTrackingNotice('');if(gift.trackingUrl){void Linking.openURL(gift.trackingUrl).catch(()=>setTrackingNotice(`Tracking is ready for order ${gift.orderId??'preview'}, but this browser could not open the partner link.`));return}setTrackingNotice('Tracking opens after the recipient accepts privately and the delivery partner confirms the order.')};
  return <View style={giftFlowStyles.chatTrack}><View style={shared.row}><View style={{flex:1}}><Text style={giftFlowStyles.chatTrackTitle}>{gift.provider??'Delivery partner'} · {gift.etaLabel??'ETA pending'}</Text>{gift.serviceLevel&&<Text style={giftFlowStyles.chatTrackFine}>{gift.serviceLevel} · {gift.acceptanceWindowMinutes??30} min private accept window · {gift.etaConfidence??'ETA'} confidence</Text>}</View><Pressable onPress={openTracking}><Text style={giftFlowStyles.trackLink}>Track</Text></Pressable></View>{!!trackingNotice&&<View style={giftFlowStyles.chatTrackNotice}><MiniPremiumIcon name="navigate-outline" tone="gold" size={28} iconSize={13}/><Text style={giftFlowStyles.chatTrackNoticeText}>{trackingNotice}</Text></View>}{steps.map((step,index)=><View key={`${step.key}-${index}`} style={giftFlowStyles.chatStep}><View style={[giftFlowStyles.chatStepDot,step.status==='done'&&giftFlowStyles.chatStepDone,step.status==='active'&&giftFlowStyles.chatStepActive]}/><View style={{flex:1}}><Text style={[giftFlowStyles.chatStepLabel,step.status==='active'&&{color:colors.ivory}]}>{step.label}</Text><Text style={giftFlowStyles.chatStepBody}>{step.body}</Text></View></View>)}{gift.totalCents&&<Text style={giftFlowStyles.chatTrackFine}>Estimated total {formatGiftMoney(gift.totalCents)} · address remains private</Text>}{gift.paymentPolicy&&<Text style={giftFlowStyles.chatTrackFine}>{gift.paymentPolicy}</Text>}{gift.cancellationPolicy&&<Text style={giftFlowStyles.chatTrackFine}>{gift.cancellationPolicy}</Text>}</View>
}

function VoiceNote({uri,durationMs}:{uri:string;durationMs:number}){
  const player=useAudioPlayer(uri);
  const status=useAudioPlayerStatus(player);
  const seconds=Math.max(1,Math.round(durationMs/1000));
  return <Pressable onPress={()=>status.playing?player.pause():player.play()} style={chatStyles.voiceNote}><PremiumIcon name={status.playing?'pause':'play'} tone="dark" size={36} iconSize={16}/><View style={chatStyles.voiceWave}>{[10,18,13,24,16,21,12,19,14,23].map((height,index)=><View key={index} style={[chatStyles.voiceBar,{height,opacity:status.playing||index%2===0?1:.45}]}/>)}</View><Text style={chatStyles.voiceDuration}>{seconds<60?`0:${String(seconds).padStart(2,'0')}`:`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`}</Text></Pressable>
}

function LiveLocationCard({location}:{location:NonNullable<ChatMessage['location']>}){
  const [mapFallback,setMapFallback]=useState('');
  const expiresIn=location.expiresAt?Math.max(0,Math.ceil((location.expiresAt-Date.now())/60000)):30;
  const coordinates=`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  const openMap=()=>{setMapFallback('');void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`).catch(()=>setMapFallback(`Map could not open in this preview. Approx location: ${coordinates}`))};
  return <View style={{gap:8}}><Pressable onPress={openMap} style={chatStyles.locationCard}><LinearGradient colors={['rgba(212,175,55,.24)','rgba(145,12,35,.52)']} style={chatStyles.locationMap}><View style={chatStyles.locationGrid}/><PremiumIcon name="navigate" tone="gold" size={46} iconSize={21}/></LinearGradient><View style={chatStyles.locationInfo}><Text style={chatStyles.locationTitle}>Live location</Text><Text style={chatStyles.locationSubtitle}>{location.label}</Text><Text style={chatStyles.locationFine}>{expiresIn>0?`${expiresIn} min left · `:'Expired · '}approximate area shared</Text></View></Pressable>{!!mapFallback&&<View style={chatStyles.locationFallback}><MiniPremiumIcon name="map-outline" tone="gold" size={26} iconSize={12}/><Text style={chatStyles.locationFallbackText}>{mapFallback}</Text></View>}</View>
}

function SafetyNudge({scan,onOpenSafety}:{scan:MessageSafetyScan;onOpenSafety:()=>void}){
  const tone=scan.severity==='urgent'||scan.severity==='high'?'ruby':scan.severity==='caution'?'gold':'rose';
  return <View style={chatStyles.safetyNudge}>
    <MiniPremiumIcon name={scan.severity==='urgent'||scan.severity==='high'?'warning-outline':'shield-checkmark-outline'} tone={tone} size={32} iconSize={15}/>
    <View style={{flex:1}}>
      <Text style={chatStyles.safetyNudgeTitle}>{scan.nudgeTitle}</Text>
      <Text style={chatStyles.safetyNudgeBody}>{scan.recommendedAction}</Text>
      <View style={chatStyles.safetySignalRow}>{scan.signals.slice(0,3).map(signal=><View key={`${signal.type}-${signal.label}`} style={chatStyles.safetySignalPill}><Text style={chatStyles.safetySignalText}>{signal.label}</Text></View>)}</View>
    </View>
    <Pressable onPress={onOpenSafety} style={chatStyles.safetyNudgeButton}><Text style={chatStyles.safetyNudgeButtonText}>Safety</Text></Pressable>
  </View>
}

function Attachment({icon,label,color,onPress}:{icon:keyof typeof Ionicons.glyphMap;label:string;color:string;onPress:()=>void}){
  const tone:PremiumIconTone=color==='#D4AF37'||['Gift','Spark','Location','Date Market','Poll'].includes(label)?'gold':['Games','More','Back','Document'].includes(label)?'plum':label==='GIF'?'rose':'ruby';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={chatStyles.attachment}><PremiumIcon name={icon} tone={tone} size={44} iconSize={19}/><Text style={chatStyles.attachmentLabel}>{label}</Text></Pressable>
}

function ChatOptionsSheet({visible,retentionLabel,screenshotAlerts,onClose,onSearch,onDate,onSettings,onSafety}:{visible:boolean;retentionLabel:string;screenshotAlerts:boolean;onClose:()=>void;onSearch:()=>void;onDate:()=>void;onSettings:()=>void;onSafety:()=>void}){
  const options=[
    {label:'Search conversation',body:'Find messages, dates and shared items.',icon:'search-outline' as const,onPress:onSearch},
    {label:'Date Marketplace',body:'Browse nearby places, packages and events.',icon:'calendar-outline' as const,onPress:onDate},
    {label:'Chat appearance',body:'Nickname and private DestinyOne couple theme.',icon:'color-palette-outline' as const,onPress:onSettings},
    {label:`Disappearing messages · ${retentionLabel}`,body:'Choose after seen, 24 hours, 7 days, or keep messages.',icon:'timer-outline' as const,onPress:onSettings},
    {label:`Screenshot alerts · ${screenshotAlerts?'On':'Off'}`,body:'Supported native captures notify both people; web capture can be undetectable.',icon:'scan-outline' as const,onPress:onSettings},
    {label:'Safety and privacy',body:'Report, block, unmatch or open the Safety Center.',icon:'shield-checkmark-outline' as const,onPress:onSafety},
  ];
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={chatStyles.sheet}><SheetHeader title="Chat options" subtitle="Conversation tools and privacy" onClose={onClose}/><View style={chatStyles.optionList}>{options.map(option=><Pressable accessibilityRole="button" accessibilityLabel={option.label} key={option.label} onPress={option.onPress} style={chatStyles.optionRow}><MiniPremiumIcon name={option.icon} tone={option.label.includes('Date')||option.label.includes('24h')?'gold':'rose'} size={36} iconSize={16}/><View style={{flex:1}}><Text style={chatStyles.optionTitle}>{option.label}</Text><Text style={chatStyles.optionBody}>{option.body}</Text></View><Ionicons name="chevron-forward" size={17} color={colors.muted}/></Pressable>)}</View></SafeAreaView></Modal>
}

function RoseComposer({visible,recipientName,availability,onClose,onSend}:{visible:boolean;recipientName:string;availability:RoseAvailability;onClose:()=>void;onSend:(note:string)=>void}){
  const [note,setNote]=useState('A Golden Spark for something real ✨');
  useEffect(()=>{if(visible)setNote('A Golden Spark for something real ✨')},[visible]);
  const canSend=availability.freeAvailable||availability.paidCredits>0;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={chatStyles.sheet}><SheetHeader title="Send a Golden Spark" subtitle={recipientName?`A warmer hello for ${recipientName}`:'A warmer hello'} onClose={onClose}/><LinearGradient colors={['#3B2208','#140004']} style={aiStyles.roseComposerHero}><PremiumIcon name="sparkles" tone="gold" size={76} iconSize={35}/><Text style={aiStyles.roseComposerTitle}>{availability.freeAvailable?'Free Spark available today':'Free Spark used today'}</Text><Text style={aiStyles.roseComposerBody}>{availability.paidCredits} paid Sparks available. Base plan gets 1 free Golden Spark every day.</Text></LinearGradient><TextInput value={note} onChangeText={setNote} multiline maxLength={120} placeholder="Write a short note…" placeholderTextColor="#8C7888" style={aiStyles.roseNote}/><Button label={canSend?'Send Spark':'Buy Spark pack'} icon="sparkles" variant={canSend?'primary':'gold'} onPress={()=>canSend?onSend(note.trim()||'A Golden Spark for something real ✨'):onSend(note.trim())}/><Text style={styles.legal}>Extra Sparks will use Google Play / App Store billing in production.</Text></SafeAreaView></Modal>
}

function RoseReceivedPopup({data,onClose,onOpenChat}:{data:RosePopupPayload|null;onClose:()=>void;onOpenChat:(match:Match)=>void}){
  const pulse=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    if(!data)return;
    pulse.setValue(0);
    const loop=Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1,duration:900,easing:Easing.inOut(Easing.ease),useNativeDriver:Platform.OS!=='web'}),
      Animated.timing(pulse,{toValue:0,duration:900,easing:Easing.inOut(Easing.ease),useNativeDriver:Platform.OS!=='web'}),
    ]));
    loop.start();
    return()=>loop.stop();
  },[data,pulse]);
  if(!data)return null;
  const scale=pulse.interpolate({inputRange:[0,1],outputRange:[.96,1.05]});
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={rosePopupStyles.backdrop}><LinearGradient colors={['#4A0010','#120004']} style={rosePopupStyles.card}><Pressable onPress={onClose} style={rosePopupStyles.close}><PremiumIcon name="close" tone="dark" size={36} iconSize={17}/></Pressable><Text style={rosePopupStyles.petal}>✦</Text><Text style={[rosePopupStyles.petal,rosePopupStyles.petalRight]}>✧</Text><Animated.View style={[rosePopupStyles.bloom,{transform:[{scale}]}]}><PremiumIcon name="sparkles" tone="gold" size={92} iconSize={42}/></Animated.View><Text style={launchStyles.scriptHero}>A Golden Spark arrived</Text><Text style={rosePopupStyles.title}>{data.match.name} gets this moment</Text><Text style={rosePopupStyles.note}>“{data.note}”</Text><View style={rosePopupStyles.pushPreview}><PremiumIcon name="notifications" tone="gold" size={38} iconSize={17}/><Text style={rosePopupStyles.pushPreviewText}>Push notification queued · opens to this romantic animation</Text></View><View style={{width:'100%',gap:10}}><Button label={`Open chat with ${data.match.name}`} icon="chatbubble" onPress={()=>onOpenChat(data.match)}/><Button label="Keep browsing" variant="ghost" onPress={onClose}/></View></LinearGradient></View></Modal>
}

function GifPicker({visible,onClose,onSelect}:{visible:boolean;onClose:()=>void;onSelect:(uri:string)=>void}){return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={[chatStyles.sheet,{maxHeight:'88%'}]}><SheetHeader title="Choose a GIF" subtitle="100 everyday reaction GIFs" onClose={onClose}/><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={chatStyles.gifGrid}>{chatGifs.map((gif,index)=><Pressable key={`${gif.title}-${index}`} onPress={()=>onSelect(gif.uri)} style={chatStyles.gifCard}><Image source={{uri:gif.uri}} style={styles.fill}/><Text style={chatStyles.gifTitle}>{gif.title}</Text></Pressable>)}</ScrollView></SafeAreaView></Modal>}

function GiftShop({visible,balance,recipientName,physicalMode,digitalMode,onClose,onSendDigital,onOrderPhysical}:{visible:boolean;balance:number;recipientName:string;physicalMode:'live'|'demo'|'blocked';digitalMode:'live'|'demo'|'blocked';onClose:()=>void;onSendDigital:(gift:DigitalGift)=>void;onOrderPhysical:(gift:PhysicalGift,note:string)=>Promise<void>}){
  const [tab,setTab]=useState<'delivered'|'digital'>('delivered');
  const [selectedGift,setSelectedGift]=useState<PhysicalGift|null>(null);
  const [note,setNote]=useState('Thinking of you ❤️');
  const [ordering,setOrdering]=useState(false);
  const [error,setError]=useState('');
  const selectedQuote=selectedGift?estimateGiftOrderQuote({productId:selectedGift.id,productName:selectedGift.name,priceCents:selectedGift.priceCents,etaHint:selectedGift.eta,recipientId:'preview'}):null;
  useEffect(()=>{if(visible){setTab('delivered');setSelectedGift(null);setNote('Thinking of you ❤️');setError('')}},[visible]);
  const placeOrder=async()=>{
    if(!selectedGift)return;
    setOrdering(true);
    setError('');
    try{await onOrderPhysical(selectedGift,note.trim())}
    catch(e){setError(e instanceof Error?e.message:'Could not place the gift order.')}
    finally{setOrdering(false)}
  };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={chatStyles.modalBackdrop} onPress={onClose}/>
    <SafeAreaView style={[chatStyles.sheet,{maxHeight:'92%'}]}>
      <SheetHeader title="Send something real" subtitle={`A beautiful surprise for ${recipientName}`} onClose={onClose}/>
      <View style={chatStyles.giftTabs}>
        <Pressable onPress={()=>setTab('delivered')} style={[chatStyles.giftTab,tab==='delivered'&&chatStyles.giftTabOn]}><MiniPremiumIcon name="bicycle" tone={tab==='delivered'?'gold':'dark'} size={28} iconSize={13}/><Text style={chatStyles.giftTabText}>Delivered gifts</Text></Pressable>
        <Pressable onPress={()=>setTab('digital')} style={[chatStyles.giftTab,tab==='digital'&&chatStyles.giftTabOn]}><MiniPremiumIcon name="sparkles" tone={tab==='digital'?'gold':'dark'} size={28} iconSize={13}/><Text style={chatStyles.giftTabText}>Digital</Text></Pressable>
      </View>
      {tab==='delivered'?<>
        <View style={chatStyles.privacyBanner}><PremiumIcon name="lock-closed" tone="gold" size={38} iconSize={18}/><Text style={chatStyles.privacyBannerText}>{recipientName}'s exact address is never shown. They accept privately first, then payment + courier order starts.</Text></View>
        <GiftFlowPreview quote={selectedQuote}/>
        <ScrollView contentContainerStyle={chatStyles.giftGrid}>
          {physicalGifts.map(gift=><Pressable key={gift.id} onPress={()=>setSelectedGift(gift)} style={[chatStyles.giftCard,selectedGift?.id===gift.id&&chatStyles.giftCardOn]}>
            <View style={chatStyles.giftPhotoWrap}><Image source={{uri:gift.photo}} style={chatStyles.giftPhoto}/><LinearGradient colors={['transparent','rgba(9,0,3,.78)']} style={StyleSheet.absoluteFill}/><View style={chatStyles.giftPhotoBadge}><MiniPremiumIcon name={physicalGiftIcon(gift.id)} tone={selectedGift?.id===gift.id?'gold':'ruby'} size={34} iconSize={16}/></View></View>
            <Text style={chatStyles.giftName}>{gift.name}</Text>
            <Text style={chatStyles.giftDescription}>{gift.caption}</Text>
            <View style={chatStyles.deliveryMeta}><Text style={chatStyles.priceText}>{formatGiftMoney(gift.priceCents)}</Text><Text style={chatStyles.etaText}>{gift.eta}</Text></View>
          </Pressable>)}
        </ScrollView>
        {selectedGift&&selectedQuote&&<View style={giftFlowStyles.quoteCard}>
          <View style={shared.row}><PremiumIcon name={physicalGiftIcon(selectedGift.id)} tone="gold" size={44} iconSize={20}/><View style={{flex:1,marginLeft:10}}><Text style={giftFlowStyles.quoteTitle}>{selectedGift.name}</Text><Text style={giftFlowStyles.quoteMeta}>{selectedQuote.serviceLevelLabel} · {selectedQuote.providerLabel} · ETA {selectedQuote.etaLabel}</Text></View><View style={giftFlowStyles.totalPill}><Text style={giftFlowStyles.totalText}>{formatGiftMoney(selectedQuote.totalCents)}</Text></View></View>
          <View style={giftFlowStyles.priceRows}><GiftPriceRow label="Gift" value={formatGiftMoney(selectedQuote.itemSubtotalCents)}/><GiftPriceRow label="Delivery" value={formatGiftMoney(selectedQuote.deliveryFeeCents)}/><GiftPriceRow label="Service + est. tax" value={formatGiftMoney(selectedQuote.serviceFeeCents+selectedQuote.estimatedTaxCents)}/></View>
          <GiftQuoteInfo quote={selectedQuote}/>
          <GiftReadinessPanel quote={selectedQuote}/>
          <GiftStatusPreview status="recipient_pending" quote={selectedQuote}/>
          <TextInput value={note} onChangeText={setNote} multiline maxLength={120} placeholder="Add a short note…" placeholderTextColor="#8C7888" style={giftFlowStyles.noteInput}/>
          <View style={giftFlowStyles.stepPreview}>{['Request','Accept','Pay','Prepare','Deliver'].map((label,index)=><View key={label} style={giftFlowStyles.stepMini}><View style={[giftFlowStyles.stepDot,index===0&&giftFlowStyles.stepDotOn]}><Text style={giftFlowStyles.stepNumber}>{index+1}</Text></View><Text style={giftFlowStyles.stepMiniText}>{label}</Text></View>)}</View>
          <Pressable disabled={ordering||physicalMode==='blocked'} onPress={()=>void placeOrder()} style={[chatStyles.checkoutButton,{width:'100%',marginTop:2},physicalMode==='blocked'&&{opacity:.45}]}><Text style={chatStyles.checkoutButtonText}>{physicalMode==='blocked'?'Delivery connection required':ordering?'Creating secure request…':`Send request · ${formatGiftMoney(selectedQuote.totalCents)}`}</Text></Pressable>
          <Text style={giftFlowStyles.quoteFine}>Payment is authorized only after {recipientName} accepts. Final provider quote can update after exact address.</Text>
        </View>}
        {!!error&&<Text style={styles.formError}>{error}</Text>}
      </>:<>
        <View style={chatStyles.balance}><MiniPremiumIcon name="sparkles" tone="gold" size={32} iconSize={15}/><Text style={chatStyles.balanceText}>{digitalMode==='demo'?`${balance} demo coins`:'Secure wallet unavailable'}</Text><Text style={chatStyles.balanceNote}>{digitalMode==='demo'?'Preview only':'Billing required'}</Text></View>
        <ScrollView contentContainerStyle={chatStyles.giftGrid}>{digitalGifts.map(gift=><Pressable disabled={digitalMode!=='demo'} key={gift.name} onPress={()=>onSendDigital(gift)} style={[chatStyles.giftCard,digitalMode!=='demo'&&{opacity:.45}]}><PremiumIcon name={digitalGiftIcon(gift.name)} tone={gift.name.includes('Promise')?'gold':'rose'} size={58} iconSize={27}/><Text style={chatStyles.giftName}>{gift.name}</Text><Text style={chatStyles.giftDescription}>{gift.caption}</Text><View style={chatStyles.coinPill}><MiniPremiumIcon name="sparkles" tone="gold" size={22} iconSize={10}/><Text style={chatStyles.coinText}>{gift.coins}</Text></View></Pressable>)}</ScrollView>
      </>}
      <Text style={chatStyles.billingNote}>{physicalMode==='blocked'||digitalMode==='blocked'?'Unavailable actions never create local orders or change local balances in a real-backend build.':'Preview transactions stay on this device and never charge a real payment method.'}</Text>
    </SafeAreaView>
  </Modal>
}

function GiftFlowPreview({quote}:{quote:GiftOrderQuote|null}){
  const steps=[
    {title:'Choose',body:'Pick gift + note'},
    {title:'Accept',body:'Recipient accepts privately'},
    {title:'Pay',body:'Authorize after consent'},
    {title:'Prepare',body:quote?.pickupPartnerName??'Local partner prepares'},
    {title:'Deliver',body:quote?.etaLabel??'ETA after gift selected'},
  ];
  return <View style={giftFlowStyles.flowPanel}>{steps.map((step,index)=><View key={step.title} style={giftFlowStyles.flowStep}><View style={[giftFlowStyles.stepDot,index===0&&giftFlowStyles.stepDotOn]}><Text style={giftFlowStyles.stepNumber}>{index+1}</Text></View><Text style={giftFlowStyles.flowTitle}>{step.title}</Text><Text style={giftFlowStyles.flowBody}>{step.body}</Text>{index<steps.length-1&&<View style={giftFlowStyles.flowLine}/>}</View>)}</View>
}

function GiftReadinessPanel({quote}:{quote:GiftOrderQuote}){
  const plan=buildGiftFulfillmentPlan(quote);
  return <View style={giftFlowStyles.readinessPanel}>
    <View style={shared.row}><MiniPremiumIcon name="git-branch-outline" tone="gold" size={30} iconSize={14}/><Text style={giftFlowStyles.readinessTitle}>Production order map</Text><View style={shared.spacer}/><Text style={giftFlowStyles.readinessBadge}>{quote.quoteValidMinutes} min quote</Text></View>
    {plan.map(item=><View key={item.title} style={giftFlowStyles.readinessRow}><MiniPremiumIcon name={item.ready?'checkmark-circle':'construct-outline'} tone={item.ready?'gold':'rose'} size={26} iconSize={12}/><View style={{flex:1}}><Text style={giftFlowStyles.readinessItemTitle}>{item.title}</Text><Text style={giftFlowStyles.readinessBody}>{item.body}</Text></View></View>)}
  </View>
}

function GiftStatusPreview({status,quote}:{status:GiftFulfillmentStatus;quote:GiftOrderQuote}){
  const summary=giftOrderSummary(status,quote);
  return <View style={[giftFlowStyles.statusPreview,summary.tone==='waiting'&&giftFlowStyles.statusWaiting]}>
    <MiniPremiumIcon name={summary.tone==='success'?'checkmark-circle':summary.tone==='support'?'alert-circle-outline':'time-outline'} tone={summary.tone==='success'?'gold':summary.tone==='support'?'ruby':'rose'} size={32} iconSize={15}/>
    <View style={{flex:1}}>
      <Text style={giftFlowStyles.statusTitle}>{summary.headline}</Text>
      <Text style={giftFlowStyles.statusBody}>{summary.body}</Text>
    </View>
    <Text style={giftFlowStyles.statusCta}>{summary.cta}</Text>
  </View>
}

function GiftQuoteInfo({quote}:{quote:GiftOrderQuote}){
  return <View style={giftFlowStyles.quoteInfo}>
    <GiftQuoteInfoRow icon="bicycle" text={quote.providerRecommendation}/>
    <GiftQuoteInfoRow icon="hourglass-outline" text={`${quote.etaConfidence} ETA confidence · recipient acceptance expires privately at ${new Date(quote.acceptanceExpiresAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}`}/>
    <GiftQuoteInfoRow icon="card" text={quote.paymentPolicy}/>
    <GiftQuoteInfoRow icon="refresh-circle" text={quote.cancellationPolicy}/>
    <GiftQuoteInfoRow icon="lock-closed" text={quote.recipientPrivacy}/>
  </View>
}

function GiftQuoteInfoRow({icon,text}:{icon:keyof typeof Ionicons.glyphMap;text:string}){
  return <View style={giftFlowStyles.quoteInfoRow}><MiniPremiumIcon name={icon} tone="gold" size={28} iconSize={13}/><Text style={giftFlowStyles.quoteInfoText}>{text}</Text></View>
}

function GiftPriceRow({label,value}:{label:string;value:string}){return <View style={giftFlowStyles.priceRow}><Text style={giftFlowStyles.priceLabel}>{label}</Text><Text style={giftFlowStyles.priceValue}>{value}</Text></View>}

function GameSheet({visible,onClose,onPlay}:{visible:boolean;onClose:()=>void;onPlay:(game:typeof coupleGames[number])=>void}){
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={chatStyles.sheet}><SheetHeader title="Couple games" subtitle="Light, playful prompts that keep serious chats alive" onClose={onClose}/><View style={gameStyles.hero}><PremiumIcon name="game-controller" tone="gold" size={44} iconSize={20}/><View style={{flex:1}}><Text style={styles.cardTitle}>Play inside chat</Text><Text style={styles.helper}>Pick a game and DestinyOne sends the first prompt. Both people reply in the same conversation.</Text></View></View><ScrollView contentContainerStyle={gameStyles.grid}>{coupleGames.map(game=><Pressable key={game.title} onPress={()=>onPlay(game)} style={gameStyles.card}><PremiumIcon name={game.icon} tone={game.icon==='diamond'?'gold':game.icon==='cafe'?'plum':'ruby'} size={44} iconSize={20}/><View style={{flex:1}}><Text style={gameStyles.title}>{game.title}</Text><Text style={gameStyles.body}>{game.prompt}</Text></View><MiniPremiumIcon name="play-circle" tone="rose" size={34} iconSize={16}/></Pressable>)}</ScrollView><Text style={chatStyles.billingNote}>Games are mutual-match only. Production can add live scoring, timers and private rooms later.</Text></SafeAreaView></Modal>
}

function CoupleSettingsSheet({visible,match,settings,onChange,onClose}:{visible:boolean;match:Match;settings:CoupleChatSettings;onChange:(settings:CoupleChatSettings)=>void;onClose:()=>void}){
  const [nickname,setNickname]=useState(settings.nickname);
  const [status,setStatus]=useState('');
  useEffect(()=>{if(visible){setNickname(settings.nickname);setStatus('')}},[visible,settings.nickname]);
  const activeTheme=coupleThemes.find(theme=>theme.name===settings.theme)??coupleThemes[0]!;
  const saveNickname=()=>{onChange({...settings,nickname:nickname.trim(),theme:settings.theme||coupleThemes[0]!.name});setStatus(nickname.trim()?`${match.name} now appears as ${nickname.trim()} in this chat.`:'Nickname removed for this match.');};
  const chooseTheme=(theme:typeof coupleThemes[number])=>{onChange({...settings,theme:theme.name});setStatus(`${theme.name} theme applied.`)};
  const retentionOptions=[
    {value:'keep' as const,label:'Keep messages',body:'Messages stay until someone deletes them.'},
    {value:'after_seen' as const,label:'Delete after seen',body:'New messages disappear once the recipient has seen them.'},
    {value:'24_hours' as const,label:'24 hours',body:'New messages disappear 24 hours after sending.'},
    {value:'7_days' as const,label:'7 days',body:'New messages disappear after one week.'},
  ];
  const chooseRetention=(retentionMode:CoupleChatSettings['retentionMode'])=>{
    onChange({...settings,retentionMode});
    setStatus(retentionMode==='keep'?'Messages will be kept.':'Privacy timer updated for new messages. Existing messages keep their current policy.');
  };
  const toggleScreenshotAlerts=()=>{
    onChange({...settings,screenshotAlerts:!settings.screenshotAlerts});
    setStatus(!settings.screenshotAlerts?'Screenshot alerts turned on where the device supports detection.':'Screenshot alerts turned off for this chat.');
  };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={[chatStyles.sheet,{maxHeight:'92%'}]}>
    <SheetHeader title="Chat settings" subtitle="Appearance, disappearing messages and capture alerts" onClose={onClose}/>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={coupleStyles.scrollContent}>
      <LinearGradient colors={[activeTheme.accent,activeTheme.panel]} start={{x:0,y:0}} end={{x:1,y:1}} style={coupleStyles.preview}>{match.photo?<Image source={{uri:match.photo}} style={coupleStyles.previewAvatar}/>:<View style={[coupleStyles.previewAvatar,chatStyles.initialAvatar]}><Text style={chatStyles.initialAvatarText}>{match.name[0]?.toUpperCase()}</Text></View>}<View style={{flex:1}}><Text style={coupleStyles.previewName}>{nickname.trim()||match.name}</Text><Text style={coupleStyles.previewMeta}>{match.name} · {activeTheme.name}</Text></View><PremiumIcon name="heart" tone="gold" size={44} iconSize={19}/></LinearGradient>
      <View style={coupleStyles.section}><Text style={styles.sectionLabel}>NICKNAME</Text><View style={coupleStyles.nicknameRow}><TextInput value={nickname} onChangeText={setNickname} placeholder={`Nickname for ${match.name}`} placeholderTextColor="#806D7D" style={coupleStyles.nicknameInput}/><Pressable onPress={saveNickname} style={coupleStyles.saveButton}><Text style={coupleStyles.saveText}>Save</Text></Pressable></View><Text style={styles.helper}>Only you see this nickname.</Text></View>
      <View style={coupleStyles.section}><Text style={styles.sectionLabel}>MESSAGE PRIVACY</Text>{retentionOptions.map(option=><Pressable accessibilityRole="radio" accessibilityState={{checked:settings.retentionMode===option.value}} key={option.value} onPress={()=>chooseRetention(option.value)} style={[coupleStyles.privacyChoice,settings.retentionMode===option.value&&coupleStyles.privacyChoiceOn]}><MiniPremiumIcon name={settings.retentionMode===option.value?'checkmark-circle':'ellipse-outline'} tone={settings.retentionMode===option.value?'gold':'dark'} size={34} iconSize={16}/><View style={{flex:1}}><Text style={coupleStyles.privacyTitle}>{option.label}</Text><Text style={coupleStyles.privacyBody}>{option.body}</Text></View></Pressable>)}</View>
      <View style={coupleStyles.section}><Text style={styles.sectionLabel}>SCREENSHOT ALERTS</Text><Pressable accessibilityRole="switch" accessibilityState={{checked:settings.screenshotAlerts}} onPress={toggleScreenshotAlerts} style={coupleStyles.captureCard}><PremiumIcon name="scan-outline" tone={settings.screenshotAlerts?'gold':'dark'} size={44} iconSize={20}/><View style={{flex:1}}><Text style={coupleStyles.privacyTitle}>Notify both people</Text><Text style={coupleStyles.privacyBody}>When a supported native device reports a capture, DestinyOne records the event and alerts the other person.</Text></View><View style={[coupleStyles.toggle,settings.screenshotAlerts&&coupleStyles.toggleOn]}><View style={[coupleStyles.toggleKnob,settings.screenshotAlerts&&coupleStyles.toggleKnobOn]}/></View></Pressable><View style={coupleStyles.limitCard}><MiniPremiumIcon name="information-circle-outline" tone="rose" size={30} iconSize={14}/><Text style={coupleStyles.limitText}>Web browsers and some operating-system capture methods cannot be detected reliably. DestinyOne will never show a false “screenshot taken” alert.</Text></View></View>
      <View style={coupleStyles.section}><View style={shared.row}><Text style={styles.sectionLabel}>COUPLE THEME</Text><View style={shared.spacer}/><Pressable onPress={()=>setStatus('Custom colors and wallpaper will be available after secure sync is connected.')} style={premiumButtonStyles.smallGhost}><Text style={discoveryStyles.manageText}>Custom</Text></Pressable></View><View style={coupleStyles.themeGrid}>{coupleThemes.map(theme=><Pressable key={theme.name} onPress={()=>chooseTheme(theme)} style={[coupleStyles.themeCard,settings.theme===theme.name&&{borderColor:theme.accent,backgroundColor:theme.soft}]}><LinearGradient colors={[theme.accent,theme.panel]} style={coupleStyles.themeDot}/><Text style={coupleStyles.themeName}>{theme.name}</Text>{settings.theme===theme.name&&<MiniPremiumIcon name="checkmark-circle" tone="gold" size={28} iconSize={13}/>}</Pressable>)}</View></View>
      {!!status&&<View style={coupleStyles.statusCard}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={28} iconSize={13}/><Text style={coupleStyles.statusText}>{status}</Text></View>}
      <Text style={chatStyles.billingNote}>Preview settings save on this device. Production timers and supported capture events are enforced by the server for mutual matches.</Text>
    </ScrollView>
  </SafeAreaView></Modal>
}

function SnapStudio({visible,onClose,onSend}:{visible:boolean;onClose:()=>void;onSend:(uri:string,filter:string,sticker:string,viewOnce:boolean)=>void}){
  const [uri,setUri]=useState('');const [filter,setFilter]=useState(snapFilters[0]!.name);const [sticker,setSticker]=useState('💘');const [viewOnce,setViewOnce]=useState(true);const [error,setError]=useState('');
  useEffect(()=>{if(visible){setUri('');setFilter(snapFilters[0]!.name);setSticker('💘');setViewOnce(true);setError('')}},[visible]);
  const choose=async(camera=false)=>{setError('');try{const permission=camera?await ImagePicker.requestCameraPermissionsAsync():await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted){setError(camera?'Camera permission is needed to create a Snap.':'Photo permission is needed to choose a Snap.');return}const result=camera?await ImagePicker.launchCameraAsync({mediaTypes:['images'],quality:.8}):await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:.8});if(!result.canceled&&result.assets[0]){setUri(result.assets[0].uri);return}setError('No photo selected. Choose camera or library to continue.')}catch(e){setError(e instanceof Error?e.message:'Could not open camera or photo library. Please try again.')}};
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><SafeAreaView style={snapStyles.screen}><View style={snapStyles.header}><Pressable onPress={onClose} style={chatStyles.sheetClose}><PremiumIcon name="close" tone="dark" size={38} iconSize={18}/></Pressable><Text style={snapStyles.headerTitle}>DestinyOne Snap</Text><Pressable disabled={!uri} onPress={()=>onSend(uri,filter,sticker,viewOnce)} style={premiumButtonStyles.smallGhost}><Text style={[snapStyles.sendText,!uri&&{opacity:.35}]}>Send</Text></Pressable></View>{uri?<View style={snapStyles.preview}><Image source={{uri}} style={styles.fill}/><View style={[StyleSheet.absoluteFill,{backgroundColor:snapFilters.find(item=>item.name===filter)?.color}]}/><Text style={snapStyles.previewSticker}>{sticker}</Text><View style={snapStyles.previewLabel}><MiniPremiumIcon name={viewOnce?'eye-off':'time'} tone="dark" size={28} iconSize={13}/><Text style={snapStyles.previewLabelText}>{viewOnce?'View once':'Available for 24 hours'}</Text></View></View>:<LinearGradient colors={['#250006','#090002']} style={snapStyles.empty}><PremiumIcon name="camera" tone="ruby" size={74} iconSize={34}/><Text style={snapStyles.emptyTitle}>Create a playful moment</Text><Text style={styles.helper}>Take a photo or choose one from your library.</Text><View style={snapStyles.emptyActions}><Button label="Camera" icon="camera" onPress={()=>void choose(true)}/><Button label="Photo library" variant="secondary" icon="images" onPress={()=>void choose(false)}/></View></LinearGradient>}{uri&&<View style={snapStyles.controls}><Text style={styles.sectionLabel}>FILTERS</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{snapFilters.map(item=><Pressable key={item.name} onPress={()=>setFilter(item.name)} style={[snapStyles.filterChip,filter===item.name&&snapStyles.filterChipOn]}><View style={[snapStyles.filterDot,{backgroundColor:item.color}]}/><Text style={snapStyles.filterText}>{item.name}</Text></Pressable>)}</ScrollView><Text style={styles.sectionLabel}>FUN STICKERS</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:14}}>{faceEmojiOptions.map(item=><Pressable key={item} onPress={()=>setSticker(item)} style={[snapStyles.emojiChoice,sticker===item&&snapStyles.emojiChoiceOn]}><Text style={{fontSize:28}}>{item}</Text></Pressable>)}</ScrollView><Pressable onPress={()=>setViewOnce(value=>!value)} style={snapStyles.viewOnce}><MiniPremiumIcon name={viewOnce?'checkmark-circle':'ellipse-outline'} tone={viewOnce?'gold':'dark'} size={34} iconSize={16}/><View><Text style={shared.label}>View once</Text><Text style={styles.helper}>A private snap that disappears after opening</Text></View></Pressable><Button label="Replace photo" variant="secondary" icon="camera-reverse" onPress={()=>void choose(true)}/></View>}{!!error&&<View style={snapStyles.errorCard}><MiniPremiumIcon name="alert-circle-outline" tone="ruby" size={28} iconSize={13}/><Text style={snapStyles.errorText}>{error}</Text></View>}</SafeAreaView></Modal>
}

function FaceEmojiStudio({visible,onClose,onSend}:{visible:boolean;onClose:()=>void;onSend:(uri:string,emoji:string,filter:string)=>void}){
  const [uri,setUri]=useState('');
  const [emoji,setEmoji]=useState('😂');
  const [filter,setFilter]=useState(snapFilters[5]!.name);
  const [error,setError]=useState('');
  const autoLaunch=useRef(false);
  useEffect(()=>{if(visible){autoLaunch.current=false;setUri('');setEmoji('😂');setFilter(snapFilters[5]!.name);setError('')}},[visible]);
  const capture=async(camera=true)=>{
    setError('');
    try{
      const permission=camera?await ImagePicker.requestCameraPermissionsAsync():await ImagePicker.requestMediaLibraryPermissionsAsync();
      if(!permission.granted){setError(camera?'Camera permission is needed for Funny Cam.':'Photo permission is needed.');return}
      const result=camera?await ImagePicker.launchCameraAsync({mediaTypes:['images'],quality:.85,allowsEditing:true,aspect:[1,1]}):await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:.85,allowsEditing:true,aspect:[1,1]});
      if(!result.canceled&&result.assets[0]){setUri(result.assets[0].uri);return}
      setError('No face photo selected. Open camera or use gallery to create a custom emoji.');
    }catch(e){
      setError(e instanceof Error?e.message:'Could not open camera. Please try again or use gallery.');
    }
  };
  useEffect(()=>{if(!visible||uri||autoLaunch.current)return;autoLaunch.current=true;const timer=setTimeout(()=>void capture(true),180);return()=>clearTimeout(timer)},[visible,uri]);
  const activeColor=snapFilters.find(item=>item.name===filter)?.color??'transparent';
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><SafeAreaView style={snapStyles.screen}><View style={snapStyles.header}><Pressable onPress={onClose} style={chatStyles.sheetClose}><PremiumIcon name="close" tone="dark" size={38} iconSize={18}/></Pressable><Text style={snapStyles.headerTitle}>Funny Cam</Text><Pressable disabled={!uri} onPress={()=>onSend(uri,emoji,filter)} style={premiumButtonStyles.smallGhost}><Text style={[snapStyles.sendText,!uri&&{opacity:.35}]}>Send</Text></Pressable></View>{uri?<View style={[snapStyles.preview,{height:'50%'}]}><Image source={{uri}} style={styles.fill}/><View style={[StyleSheet.absoluteFill,{backgroundColor:activeColor}]}/><Text style={snapStyles.previewSticker}>{emoji}</Text><View style={snapStyles.previewLabel}><MiniPremiumIcon name="sparkles" tone="gold" size={28} iconSize={13}/><Text style={snapStyles.previewLabelText}>{filter}</Text></View></View>:<LinearGradient colors={['#2B0007','#090002']} style={snapStyles.empty}><PremiumIcon name="camera" tone="ruby" size={76} iconSize={35}/><Text style={snapStyles.emptyTitle}>Opening camera…</Text><Text style={[styles.helper,{textAlign:'center'}]}>Funny Cam starts with camera. If your browser blocks it, tap Open camera below.</Text><View style={snapStyles.emptyActions}><Button label="Open camera" icon="camera" onPress={()=>void capture(true)}/><Button label="Use gallery" variant="secondary" icon="images" onPress={()=>void capture(false)}/></View></LinearGradient>}<View style={snapStyles.controls}><Text style={styles.sectionLabel}>{snapFilters.length} FUNNY CAMERA FILTERS</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{snapFilters.map(item=><Pressable key={item.name} onPress={()=>setFilter(item.name)} style={[snapStyles.filterChip,filter===item.name&&snapStyles.filterChipOn]}><View style={[snapStyles.filterDot,{backgroundColor:item.color}]}/><Text style={snapStyles.filterText}>{item.name}</Text></Pressable>)}</ScrollView><Text style={styles.sectionLabel}>CUSTOM FACE EMOJI / PROPS</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12}}>{faceEmojiOptions.map(item=><Pressable key={item} onPress={()=>setEmoji(item)} style={[snapStyles.emojiChoice,emoji===item&&snapStyles.emojiChoiceOn]}><Text style={{fontSize:29}}>{item}</Text></Pressable>)}</ScrollView><View style={chatStyles.privacyBanner}><PremiumIcon name="shield-checkmark" tone="gold" size={38} iconSize={18}/><Text style={chatStyles.privacyBannerText}>Use only your own face. Funny Cam photos stay in chat and are not used for matching or ads.</Text></View>{uri&&<Button label="Retake with camera" variant="secondary" icon="camera-reverse" onPress={()=>void capture(true)}/>} {!!error&&<Text style={styles.formError}>{error}</Text>}</View></SafeAreaView></Modal>
}

function CallModal({mode,match,isCoupleMode,onClose}:{mode:'audio'|'video'|null;match:Match;isCoupleMode:boolean;onClose:()=>void}){
  const [muted,setMuted]=useState(false);
  const [speaker,setSpeaker]=useState(true);
  const [cameraOn,setCameraOn]=useState(mode==='video');
  const [seconds,setSeconds]=useState(0);
  useEffect(()=>{
    if(!mode)return;
    setMuted(false);
    setSpeaker(true);
    setCameraOn(mode==='video');
    setSeconds(0);
    const timer=setInterval(()=>setSeconds(value=>value+1),1000);
    return()=>clearInterval(timer);
  },[mode]);
  if(!mode)return null;
  const elapsed=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><LinearGradient colors={['rgba(22,0,7,.97)','rgba(8,0,3,.98)']} style={callStyles.backdrop}><SafeAreaView style={callStyles.content}><View style={callStyles.topPill}><MiniPremiumIcon name="shield-checkmark" tone="gold" size={28} iconSize={13}/><Text style={callStyles.topPillText}>{isCoupleMode?'Private couple call':'Mutual-match call'} · {elapsed}</Text></View><View style={callStyles.avatarWrap}>{match.photo?<Image source={{uri:match.photo}} style={callStyles.callAvatar}/>:<View style={[callStyles.callAvatar,chatStyles.initialAvatar]}><Text style={[chatStyles.initialAvatarText,{fontSize:42}]}>{match.name[0]?.toUpperCase()}</Text></View>}<View style={callStyles.callPulse}/></View><Text style={callStyles.callName}>{match.name}</Text><Text style={callStyles.callStatus}>{muted?'You are muted':mode==='video'&&cameraOn?'Secure video preview active':'Secure audio connected'}</Text>{mode==='video'&&<View style={callStyles.videoPreview}>{cameraOn?<>{match.photo?<Image source={{uri:match.photo}} style={callStyles.videoRemote}/>:<View style={[callStyles.videoRemote,chatStyles.initialAvatar]}><Text style={[chatStyles.initialAvatarText,{fontSize:52}]}>{match.name[0]?.toUpperCase()}</Text></View>}<LinearGradient colors={['transparent','rgba(8,0,3,.78)']} style={StyleSheet.absoluteFill}/><View style={callStyles.selfPreview}><PremiumIcon name="person" tone="dark" size={34} iconSize={16}/><Text style={callStyles.selfPreviewText}>You</Text></View><View style={callStyles.callStatePill}><MiniPremiumIcon name="videocam" tone="gold" size={24} iconSize={11}/><Text style={callStyles.callStateText}>Camera on</Text></View></>:<><PremiumIcon name="videocam-off" tone="ruby" size={58} iconSize={27}/><Text style={[styles.helper,{textAlign:'center'}]}>Camera is off. Audio continues.</Text></>}</View>}<View style={callStyles.callActions}><CallAction active={muted} icon={muted?'mic-off':'mic-outline'} label={muted?'Muted':'Mute'} onPress={()=>setMuted(value=>!value)}/><CallAction active={mode==='video'?cameraOn:speaker} icon={mode==='video'?(cameraOn?'videocam':'videocam-off'):(speaker?'volume-high':'volume-mute')} label={mode==='video'?(cameraOn?'Camera on':'Camera off'):(speaker?'Speaker':'Earpiece')} onPress={()=>mode==='video'?setCameraOn(value=>!value):setSpeaker(value=>!value)}/><CallAction danger icon="call" label="End" onPress={onClose}/></View><Text style={callStyles.callFine}>Preview simulates call controls locally. Production will connect WebRTC, permissions, push ringing and reporting.</Text></SafeAreaView></LinearGradient></Modal>
}

function CallAction({icon,label,onPress,danger,active}:{icon:keyof typeof Ionicons.glyphMap;label:string;onPress:()=>void;danger?:boolean;active?:boolean}){return <Pressable onPress={onPress} style={callStyles.callAction}><View style={[callStyles.callActionFrame,active&&callStyles.callActionFrameOn,danger&&callStyles.callActionFrameDanger]}><PremiumIcon name={icon} tone={danger?'ruby':active?'gold':'dark'} size={58} iconSize={24}/></View><Text style={[callStyles.callActionText,active&&{color:colors.gold},danger&&{color:colors.danger}]}>{label}</Text></Pressable>}

function SheetHeader({title,subtitle,onClose}:{title:string;subtitle:string;onClose:()=>void}){return <View style={chatStyles.sheetHeader}><View><Text style={shared.h2}>{title}</Text><Text style={styles.helper}>{subtitle}</Text></View><Pressable onPress={onClose} style={chatStyles.sheetClose}><PremiumIcon name="close" tone="dark" size={38} iconSize={18}/></Pressable></View>}

function AppNoticeSheet({notice,onClose,onAction}:{notice:AppNotice|null;onClose:()=>void;onAction:(screen:Screen)=>void}){
  if(!notice)return null;
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={noticeStyles.sheet}><View style={noticeStyles.hero}><PremiumIcon name={notice.icon} tone={notice.tone??'gold'} size={58} iconSize={27}/><View style={{flex:1}}><Text style={noticeStyles.title}>{notice.title}</Text><Text style={noticeStyles.body}>{notice.body}</Text></View></View><View style={noticeStyles.actions}>{notice.actionLabel&&notice.actionScreen?<Button label={notice.actionLabel} icon="arrow-forward" variant="gold" onPress={()=>onAction(notice.actionScreen!)}/>:null}<Button label="Done" variant={notice.actionLabel?'secondary':'primary'} onPress={onClose}/></View></SafeAreaView></Modal>
}

const reportReasons=['Fake or misleading profile','Harassment or disrespect','Asked for money','Inappropriate content','Safety concern','Something else'];

function SafetyActions({mode='seeking',visible,match,onClose,onSafetyCenter,onReport,onBlock,onUnmatch}:{mode?:ExperienceMode;visible:boolean;match:Match;onClose:()=>void;onSafetyCenter:()=>void;onReport:(reason:string,details?:string)=>void;onBlock:()=>void;onUnmatch:()=>void}){
  const [reportMode,setReportMode]=useState(false);
  const [confirmAction,setConfirmAction]=useState<'block'|'unmatch'|null>(null);
  const [reason,setReason]=useState('');
  const [details,setDetails]=useState('');
  const close=()=>{setReportMode(false);setConfirmAction(null);setReason('');setDetails('');onClose()};
  const confirmCopy=confirmAction==='block'
    ? {title:`Block ${match.name}?`,body:mode==='couple'?'This hides the shared conversation on this account. They are not notified by this preview.':'You will no longer see each other in matches, likes or chats. They are not notified.',icon:'ban-outline' as const,label:'Block privately',action:onBlock}
    : {title:`Unmatch ${match.name}?`,body:'This removes the connection and conversation from your DestinyOne preview.',icon:'person-remove-outline' as const,label:'Unmatch',action:onUnmatch};
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}><Pressable style={chatStyles.modalBackdrop} onPress={close}/><SafeAreaView style={[chatStyles.sheet,{maxHeight:'82%'}]}>{confirmAction?<><SheetHeader title={confirmCopy.title} subtitle="This action helps keep your space intentional." onClose={close}/><View style={safetyStyles.confirmCard}><PremiumIcon name={confirmCopy.icon} tone="ruby" size={58} iconSize={27}/><View style={{flex:1}}><Text style={styles.cardTitle}>{confirmCopy.title}</Text><Text style={styles.helper}>{confirmCopy.body}</Text></View></View><View style={safetyStyles.confirmActions}><Button label="Keep connection" variant="secondary" onPress={()=>setConfirmAction(null)}/><Button label={confirmCopy.label} icon={confirmCopy.icon} onPress={()=>{confirmCopy.action();close()}}/></View></>:reportMode?<><SheetHeader title="Report privately" subtitle={`${match.name} will not be notified`} onClose={close}/><ScrollView contentContainerStyle={{gap:9}}>{reportReasons.map(item=><Pressable key={item} onPress={()=>setReason(item)} style={[safetyStyles.reason,reason===item&&safetyStyles.reasonOn]}><Text style={safetyStyles.reasonText}>{item}</Text><MiniPremiumIcon name={reason===item?'checkmark-circle':'ellipse-outline'} tone={reason===item?'gold':'dark'} size={32} iconSize={15}/></Pressable>)}<TextInput value={details} onChangeText={setDetails} multiline maxLength={500} placeholder="Add details · optional" placeholderTextColor="#856F81" style={safetyStyles.reportInput}/></ScrollView><Button disabled={!reason} label="Submit report" onPress={()=>{onReport(reason,details.trim()||undefined);close()}}/></>:<><SheetHeader title={match.name} subtitle="Your safety and boundaries come first" onClose={close}/><SafetyAction icon="shield-checkmark-outline" title="Safety Center" body="Check-ins, guidance and privacy controls" onPress={onSafetyCenter}/><SafetyAction icon="flag-outline" title="Report" body="Privately alert the DestinyOne safety team" onPress={()=>setReportMode(true)}/>{mode!=='couple'&&<SafetyAction icon="person-remove-outline" title="Unmatch" body="Remove this connection and conversation" danger onPress={()=>setConfirmAction('unmatch')}/>}<SafetyAction icon="ban-outline" title="Block" body={mode==='couple'?'Hide this shared conversation on your account':'Immediately hide each other everywhere'} danger onPress={()=>setConfirmAction('block')}/></>}</SafeAreaView></Modal>
}

function SafetyAction({icon,title,body,onPress,danger}:{icon:keyof typeof Ionicons.glyphMap;title:string;body:string;onPress:()=>void;danger?:boolean}){
  return <Pressable onPress={onPress} style={safetyStyles.action}><PremiumIcon name={icon} tone={danger?'ruby':'rose'} size={44} iconSize={20}/><View style={{flex:1}}><Text style={[styles.cardTitle,danger&&{color:colors.danger}]}>{title}</Text><Text style={styles.helper}>{body}</Text></View><MiniPremiumIcon name="chevron-forward" tone="dark" size={30} iconSize={14}/></Pressable>
}

type SafetyTool = 'plan'|'emergency'|'privacy'|'data'|'delete';

function SafetyCenter({reports,blockedCount,datePlans,safeCheckIns,onCheckIn,onDeleteAccount,onBack}:{reports:LocalReport[];blockedCount:number;datePlans:ChatMessage[];safeCheckIns:string[];onCheckIn:(id:string)=>void;onDeleteAccount:()=>void;onBack:()=>void}){
  const [activeTool,setActiveTool]=useState<SafetyTool|null>(null);
  return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}>
    <SafeAreaView style={shared.safe}>
      <View style={safetyStyles.header}><Pressable onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable><Text style={[styles.cardTitle,{marginLeft:12}]}>Safety Center</Text></View>
      <ScrollView contentContainerStyle={safetyStyles.content} showsVerticalScrollIndicator={false}>
        <View style={safetyStyles.hero}><PremiumIcon name="shield-checkmark" tone="gold" size={76} iconSize={36}/><Text style={[shared.h1,{textAlign:'center'}]}>Meet with confidence.</Text><Text style={[shared.body,{textAlign:'center'}]}>Tools for boundaries, safer dates and complete control of your data.</Text></View>
        <View style={safetyStyles.overview}><SafetyStat value={reports.length} label="Reports submitted"/><SafetyStat value={blockedCount} label="People blocked"/><SafetyStat value={safeCheckIns.length} label="Safe check-ins"/></View>
        <View style={safetyStyles.promiseCard}><PremiumIcon name="lock-closed" tone="gold" size={48} iconSize={22}/><View style={{flex:1}}><Text style={styles.cardTitle}>Private actions. Clear boundaries.</Text><Text style={styles.helper}>Reports stay confidential, blocks are silent, and date check-ins are yours to control.</Text></View></View>
        {reports.length>0&&<View style={safetyStyles.section}><Text style={styles.sectionLabel}>LATEST REPORT ACTIONS</Text>{reports.slice(-2).reverse().map(report=><SafetyReportPlan key={report.id} report={report}/>)}</View>}
        {datePlans.length>0&&<View style={safetyStyles.section}><Text style={styles.sectionLabel}>DATE CHECK-INS</Text>{datePlans.slice(-2).map(message=><View key={message.id} style={safetyStyles.checkInCard}><PremiumIcon name="calendar" tone="gold" size={42} iconSize={19}/><View style={{flex:1}}><Text style={styles.cardTitle}>{message.date?.venue}</Text><Text style={styles.helper}>{message.date?.time} · {message.date?.area}</Text></View>{safeCheckIns.includes(message.id)?<View style={safetyStyles.safeDone}><MiniPremiumIcon name="checkmark" tone="gold" size={24} iconSize={11}/><Text style={safetyStyles.safeDoneText}>I’m safe</Text></View>:<Pressable onPress={()=>onCheckIn(message.id)} style={safetyStyles.checkInButton}><Text style={safetyStyles.checkInButtonText}>Check in</Text></Pressable>}</View>)}</View>}
        <View style={safetyStyles.warning}><PremiumIcon name="warning-outline" tone="gold" size={44} iconSize={21}/><View style={{flex:1}}><Text style={styles.cardTitle}>Money requests are a red flag</Text><Text style={styles.helper}>Never send money, crypto, gift cards or financial details to someone you met through the app. Report the conversation immediately.</Text></View></View>
        <View style={safetyStyles.section}><Text style={styles.sectionLabel}>SAFETY TOOLS</Text><SafetyAction icon="location-outline" title="Share a date plan" body="Let someone you trust know where you’ll be" onPress={()=>setActiveTool('plan')}/><SafetyAction icon="call-outline" title="Emergency help" body="Call local emergency services if you are in immediate danger" onPress={()=>setActiveTool('emergency')}/><SafetyAction icon="document-lock-outline" title="Privacy controls" body="Review discovery, location and stored activity" onPress={()=>setActiveTool('privacy')}/></View>
        <View style={safetyStyles.section}><Text style={styles.sectionLabel}>YOUR DATA</Text><Pressable onPress={()=>setActiveTool('data')} style={safetyStyles.dataCard}><PremiumIcon name="download-outline" tone="rose" size={42} iconSize={19}/><View style={{flex:1}}><Text style={styles.cardTitle}>Download my data</Text><Text style={styles.helper}>Request a private export of your profile, matches and messages.</Text></View><MiniPremiumIcon name="chevron-forward" tone="dark" size={30} iconSize={14}/></Pressable><Pressable onPress={()=>setActiveTool('delete')} style={safetyStyles.deleteCard}><PremiumIcon name="trash-outline" tone="ruby" size={42} iconSize={19}/><View style={{flex:1}}><Text style={[styles.cardTitle,{color:colors.danger}]}>Delete account</Text><Text style={styles.helper}>Permanently remove your account and associated data.</Text></View><MiniPremiumIcon name="chevron-forward" tone="ruby" size={30} iconSize={14}/></Pressable></View>
        <Text style={safetyStyles.disclaimer}>DestinyOne cannot guarantee another person’s identity or behavior. Meet in public, arrange your own transport and trust your instincts.</Text>
      </ScrollView>
      {activeTool&&<SafetyToolSheet tool={activeTool} datePlans={datePlans} safeCheckIns={safeCheckIns} onCheckIn={onCheckIn} onDeleteAccount={onDeleteAccount} onClose={()=>setActiveTool(null)}/>}
    </SafeAreaView>
  </LinearGradient>
}

function SafetyReadinessCard({checklist}:{checklist:SafetyChecklistItem[]}){
  const score=safetyReadinessScore(checklist);
  return <View style={safetyStyles.guardianCard}>
    <View style={shared.row}><PremiumIcon name="shield-half-outline" tone="gold" size={48} iconSize={22}/><View style={{flex:1,marginLeft:10}}><Text style={styles.kicker}>SAFETY GUARDIAN</Text><Text style={styles.cardTitle}>{score}% launch-ready safety layer</Text><Text style={styles.helper}>Reports, blocks, date check-ins and Trust Ops routing are wired for preview before backend keys.</Text></View></View>
    <View style={safetyStyles.guardianTrack}><View style={[safetyStyles.guardianFill,{width:`${score}%`}]}/></View>
    {checklist.map(item=><View key={item.key} style={safetyStyles.guardianRow}><MiniPremiumIcon name={item.ready?'checkmark-circle':'ellipse-outline'} tone={item.ready?'gold':'rose'} size={28} iconSize={13}/><View style={{flex:1}}><Text style={safetyStyles.guardianTitle}>{item.title}</Text><Text style={safetyStyles.guardianBody}>{item.body}</Text></View></View>)}
  </View>
}

function SafetyReportPlan({report}:{report:LocalReport}){
  const plan=buildReportActionPlan(report.reason,report.details);
  const riskTone=plan.risk==='Critical'||plan.risk==='High'?'ruby':plan.risk==='Medium'?'gold':'rose';
  return <View style={safetyStyles.reportPlanCard}><MiniPremiumIcon name="flag-outline" tone={riskTone} size={34} iconSize={16}/><View style={{flex:1}}><Text style={safetyStyles.guardianTitle}>{plan.category.replace('_',' ')} · {plan.risk}</Text><Text style={safetyStyles.guardianBody}>{plan.primaryAction}</Text><Text style={safetyStyles.guardianBody}>{plan.memberCopy}</Text></View><Text style={safetyStyles.reportPlanScore}>{plan.riskScore}</Text></View>
}

function SafetyToolSheet({tool,datePlans,safeCheckIns,onCheckIn,onDeleteAccount,onClose}:{tool:SafetyTool;datePlans:ChatMessage[];safeCheckIns:string[];onCheckIn:(id:string)=>void;onDeleteAccount:()=>void;onClose:()=>void}){
  const preview=memberDataRuntime.source==='preview';
  const [sharedPlan,setSharedPlan]=useState(false);
  const [sharePlanStatus,setSharePlanStatus]=useState('');
  const [exportRequested,setExportRequested]=useState(false);
  const [emergencyFallback,setEmergencyFallback]=useState(false);
  const [privacy,setPrivacy]=useState({hideLastSeen:false,pauseLocation:true,limitProfileViews:false});
  const latestPlan=[...datePlans].reverse().find(message=>message.date);
  const planText=latestPlan?.date?`DestinyOne date plan: ${latestPlan.date.venue}, ${latestPlan.date.area}, ${latestPlan.date.time}. Safety check-in: ${latestPlan.date.safetyCheckIn?'on':'off'}.`:'No date plan is saved yet. Plan a date from chat first.';
  const sharePlan=async()=>{
    setSharedPlan(true);
    setSharePlanStatus('');
    try{await Share.share({title:'DestinyOne date plan',message:planText});setSharePlanStatus('Date plan share card is ready for your trusted contact.')}catch{setSharePlanStatus('Share sheet is unavailable in this preview. Copy this plan from the card above and send it to someone you trust.')}
  };
  const callEmergency=()=>{setEmergencyFallback(false);void Linking.openURL('tel:911').catch(()=>setEmergencyFallback(true))};
  const titles={
    plan:['Share date plan','Send a public-place plan to someone you trust.'] as const,
    emergency:['Emergency help','Fast actions if something feels unsafe.'] as const,
    privacy:['Privacy controls','Control what signals are visible and what the app remembers.'] as const,
    data:['Download my data','Prepare a private export request for your account data.'] as const,
    delete:['Delete account','Confirm permanent account deletion.'] as const,
  };
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={[chatStyles.sheet,{maxHeight:'86%'}]}><SheetHeader title={titles[tool][0]} subtitle={titles[tool][1]} onClose={onClose}/>
    {tool==='plan'&&<View style={{gap:12}}><View style={safetyStyles.toolHero}><PremiumIcon name="location" tone="gold" size={50} iconSize={23}/><View style={{flex:1}}><Text style={styles.cardTitle}>{latestPlan?.date?.venue??'No active date plan yet'}</Text><Text style={styles.helper}>{latestPlan?.date?`${latestPlan.date.time} · ${latestPlan.date.area}`:'Open chat → Date to create one before sharing.'}</Text></View></View><View style={safetyStyles.sharePreview}><Text style={safetyStyles.shareText}>{planText}</Text></View>{!!sharePlanStatus&&<View style={safetyStyles.inlineNotice}><MiniPremiumIcon name="share-social" tone="gold" size={28} iconSize={13}/><Text style={safetyStyles.inlineNoticeText}>{sharePlanStatus}</Text></View>}{latestPlan&&!safeCheckIns.includes(latestPlan.id)&&<Pressable onPress={()=>onCheckIn(latestPlan.id)} style={safetyStyles.checkInWide}><MiniPremiumIcon name="shield-checkmark" tone="gold" size={26} iconSize={12}/><Text style={safetyStyles.checkInWideText}>Mark this plan as safe after date</Text></Pressable>}<Button disabled={!latestPlan} label={sharedPlan?'Share card prepared':'Share with trusted contact'} icon="share-social" onPress={()=>void sharePlan()}/></View>}
    {tool==='emergency'&&<View style={{gap:12}}><View style={safetyStyles.emergencyCard}><PremiumIcon name="warning" tone="ruby" size={54} iconSize={25}/><View style={{flex:1}}><Text style={[styles.cardTitle,{color:colors.danger}]}>If you are in immediate danger</Text><Text style={styles.helper}>Leave the situation if you can, move to a public place, and contact emergency services.</Text></View></View><Button label="Call emergency services" icon="call" variant="gold" onPress={callEmergency}/>{emergencyFallback&&<View style={safetyStyles.emergencyFallback}><MiniPremiumIcon name="call" tone="ruby" size={30} iconSize={14}/><Text style={safetyStyles.emergencyFallbackText}>This preview could not open your phone dialer. Please call local emergency services immediately from your device.</Text></View>}<View style={safetyStyles.toolList}>{['Keep conversations in DestinyOne until trust is built.','Do not share exact home/work address early.','Use your own transport for first dates.','Report pressure, money requests, threats or fake identity.'].map(item=><View key={item} style={safetyStyles.toolRow}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={26} iconSize={12}/><Text style={safetyStyles.toolRowText}>{item}</Text></View>)}</View></View>}
    {tool==='privacy'&&<View style={{gap:11}}><SafetyLocalToggle title="Hide last online" body="Keep your recent activity private from matches." value={privacy.hideLastSeen} onPress={()=>preview?setPrivacy(current=>({...current,hideLastSeen:!current.hideLastSeen})):setSharePlanStatus('Secure privacy settings connection required. No account setting was changed.')}/><SafetyLocalToggle title="Limit approximate location" body="Use city-level discovery and avoid exact-place matching." value={privacy.pauseLocation} onPress={()=>preview?setPrivacy(current=>({...current,pauseLocation:!current.pauseLocation})):setSharePlanStatus('Secure privacy settings connection required. No account setting was changed.')}/><SafetyLocalToggle title="Private profile-view alerts" body="Only send profile-view notifications after deeper views." value={privacy.limitProfileViews} onPress={()=>preview?setPrivacy(current=>({...current,limitProfileViews:!current.limitProfileViews})):setSharePlanStatus('Secure privacy settings connection required. No account setting was changed.')}/>{!!sharePlanStatus&&<View style={safetyStyles.inlineNotice}><MiniPremiumIcon name="lock-closed" tone="gold" size={28} iconSize={13}/><Text style={safetyStyles.inlineNoticeText}>{sharePlanStatus}</Text></View>}<View style={safetyStyles.privacySummary}><MiniPremiumIcon name="lock-closed" tone="gold" size={30} iconSize={14}/><Text style={[styles.helper,{flex:1}]}>{preview?'Preview controls update only this device.':'Live controls change only after secure server confirmation.'}</Text></View></View>}
    {tool==='data'&&<View style={{gap:12}}><View style={safetyStyles.toolHero}><PremiumIcon name="download-outline" tone="rose" size={50} iconSize={23}/><View style={{flex:1}}><Text style={styles.cardTitle}>Export package</Text><Text style={styles.helper}>Profile, preferences, match decisions, safety reports and chat metadata.</Text></View></View><View style={safetyStyles.toolList}>{['Profile and onboarding answers','Match decisions and filters','Reports, blocks and safety check-ins','Messages export after identity verification'].map(item=><View key={item} style={safetyStyles.toolRow}><MiniPremiumIcon name="document-text-outline" tone="rose" size={26} iconSize={12}/><Text style={safetyStyles.toolRowText}>{item}</Text></View>)}</View>{exportRequested?<View style={safetyStyles.exportReady}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={32} iconSize={15}/><Text style={safetyStyles.exportReadyText}>Preview export request prepared. No email or server request was created.</Text></View>:preview?<Button label="Prepare preview export" icon="download" onPress={()=>setExportRequested(true)}/>:<View style={safetyStyles.exportReady}><MiniPremiumIcon name="lock-closed" tone="ruby" size={32} iconSize={15}/><Text style={safetyStyles.exportReadyText}>Secure data export is unavailable until identity verification and the live export endpoint are connected. No request was created.</Text></View>}</View>}
    {tool==='delete'&&<View style={{gap:12}}><View style={safetyStyles.deleteConfirm}><PremiumIcon name="trash-outline" tone="ruby" size={58} iconSize={27}/><View style={{flex:1}}><Text style={[styles.cardTitle,{color:colors.danger}]}>Delete your DestinyOne account?</Text><Text style={styles.helper}>This deletes your profile and associated data. Active app-store subscriptions must be managed separately.</Text></View></View><View style={safetyStyles.toolList}>{['Your profile will stop appearing in matches.','Reports and safety records may be retained where legally required.','This preview action clears local app data after confirmation.'].map(item=><View key={item} style={safetyStyles.toolRow}><MiniPremiumIcon name="alert-circle-outline" tone="ruby" size={26} iconSize={12}/><Text style={safetyStyles.toolRowText}>{item}</Text></View>)}</View><Button label="Delete account" icon="trash" onPress={onDeleteAccount}/><Button label="Keep my account" variant="secondary" onPress={onClose}/></View>}
  </SafeAreaView></Modal>
}

function SafetyLocalToggle({title,body,value,onPress}:{title:string;body:string;value:boolean;onPress:()=>void}){
  return <Pressable onPress={onPress} style={safetyStyles.localToggle}><View style={{flex:1}}><Text style={safetyStyles.localToggleTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View><View style={[discoveryStyles.switch,value&&discoveryStyles.switchOn]}><View style={[discoveryStyles.switchThumb,value&&discoveryStyles.switchThumbOn]}/></View></Pressable>
}

function SafetyStat({value,label}:{value:number;label:string}){return <View style={safetyStyles.stat}><Text style={safetyStyles.statValue}>{value}</Text><Text style={safetyStyles.statLabel}>{label}</Text></View>}

const previewPrivateLikeCount=memberDataRuntime.source==='preview'?'24':'—';
function Likes({openPricing,navigate}:{openPricing:()=>void;navigate:(s:Screen)=>void}){const preview=memberDataRuntime.source==='preview';return <SafeAreaView style={{flex:1}}><ScrollView contentContainerStyle={{padding:22,paddingBottom:120,gap:25}}><SectionTitle eyebrow="Private & intentional" title="People who noticed you." body={preview?`${previewPrivateLikeCount} people have shown private interest. Upgrade to see everyone.`:"Incoming interest stays private and appears only after secure account sync."}/>{preview?<View style={styles.likesGrid}>{matches.slice(0,2).map(m=><View key={m.id} style={styles.likeCard}><Image source={{uri:m.photo}} blurRadius={18} style={styles.fill}/><LinearGradient colors={['transparent','rgba(11,11,15,.9)']} style={StyleSheet.absoluteFill}/><View style={styles.likeLock}><MiniPremiumIcon name="lock-closed" tone="gold" size={34} iconSize={16}/></View><Text style={styles.likeText}>Someone in {m.city.split(',')[0]}</Text></View>)}</View>:<View style={[shared.card,{gap:12,alignItems:'center'}]}><PremiumIcon name="lock-closed" tone="gold" size={54} iconSize={25}/><Text style={styles.cardTitle}>Secure likes sync required</Text><Text style={[styles.helper,{textAlign:'center'}]}>DestinyOne will not show sample people or invented like counts. Your verified incoming interests will appear here when the live likes feed is connected.</Text></View>}<View style={[shared.card,{gap:14,borderColor:'#6C5520'}]}><PremiumIcon name="sparkles" tone="gold" size={48} iconSize={22}/><Text style={styles.cardTitle}>See who chose you</Text><Text style={shared.body}>{preview?'Plus members can see likes, meet up to 5 daily matches, and hear voice intros.':'Membership access will unlock verified incoming interests after entitlement and likes sync are both active.'}</Text><Button label="Explore DestinyOne Plus" variant="gold" onPress={openPricing}/></View></ScrollView><BottomNav active="explore" navigate={navigate}/></SafeAreaView>}

function Profile({experienceMode,connectionStatus,partnerName,onModeChange,onOpenTool,profile,verified,profilePhoto,hasVoiceIntro,lastSeenVisible,analyticsConsent,onLastSeenVisibleChange,onAnalyticsConsentChange,onInvite,navigate,onReset}:{experienceMode:ExperienceMode;connectionStatus:CoupleModeState['connection']['status'];partnerName?:string;onModeChange:(mode:ExperienceMode)=>void;onOpenTool:(tool:Exclude<CoupleLaunchTool,null>)=>void;profile:ProfileDraft;verified:boolean;profilePhoto?:string;hasVoiceIntro:boolean;lastSeenVisible:boolean;analyticsConsent:boolean;onLastSeenVisibleChange:(value:boolean)=>void;onAnalyticsConsentChange:(value:boolean)=>void;onInvite:()=>void;navigate:(s:Screen)=>void;onReset:()=>void}){
  const [settingsOpen,setSettingsOpen]=useState(false);
  const isCoupleMode=experienceMode==='couple';
  const displayName=profile.firstName.trim()||'Member';
  const displayAge=profile.age.trim()||(memberDataRuntime.source==='preview'?'30':'');
  const displayCity=profile.city.trim()||(memberDataRuntime.source==='preview'?'New York, NY':'City not added');
  const displayProfession=profile.profession.trim()||(memberDataRuntime.source==='preview'?'Professional':'Profession not added');
  const profileStrength=(verified?34:16)+(profilePhoto?20:0)+(hasVoiceIntro?18:0)+16+12;
  const profileActions=isCoupleMode?[
    {label:'Couple details',body:'Names, city and connection',icon:'heart-outline' as const,tone:'rose' as PremiumIconTone,onPress:()=>navigate('coupleSetup')},
    {label:'Send a gift',body:partnerName?`A thoughtful moment for ${partnerName}`:'Connect your partner first',icon:'gift-outline' as const,tone:'gold' as PremiumIconTone,onPress:()=>onOpenTool('gift')},
    {label:'Trust hub',body:'Verification and identity',icon:'shield-checkmark-outline' as const,tone:'gold' as PremiumIconTone,onPress:()=>navigate('verifyHub')},
    {label:'Safety',body:'Privacy and support',icon:'lock-closed-outline' as const,tone:'gold' as PremiumIconTone,onPress:()=>navigate('safety')},
  ]:[
    {label:'Edit profile',body:'Photos and details',icon:'person-outline' as const,tone:'rose' as PremiumIconTone,onPress:()=>navigate('profileSetup')},
    {label:'Preferences',body:'Intent and filters',icon:'options-outline' as const,tone:'rose' as PremiumIconTone,onPress:()=>navigate('discovery')},
    {label:'Trust hub',body:'Verification and vouches',icon:'shield-checkmark-outline' as const,tone:'gold' as PremiumIconTone,onPress:()=>navigate('verifyHub')},
    {label:'Safety',body:'Privacy and support',icon:'lock-closed-outline' as const,tone:'gold' as PremiumIconTone,onPress:()=>navigate('safety')},
  ];
  const experienceActions=isCoupleMode?[
    {label:'Our Chat',body:'Private conversation',icon:'chatbubble-ellipses-outline' as const,tone:'ruby' as PremiumIconTone,onPress:()=>navigate('chat')},
    {label:'Dates & Events',body:'Plan something together',icon:'calendar-outline' as const,tone:'rose' as PremiumIconTone,onPress:()=>navigate('events')},
    {label:'Membership',body:'Plans and billing',icon:'diamond-outline' as const,tone:'gold' as PremiumIconTone,onPress:()=>navigate('pricing')},
    {label:'Help',body:'Private assistance',icon:'help-circle-outline' as const,tone:'dark' as PremiumIconTone,onPress:()=>navigate('support')},
  ]:[
    {label:'Relationship Coach',body:'Thoughtful guidance',icon:'sparkles-outline' as const,tone:'plum' as PremiumIconTone,onPress:()=>navigate('coach')},
    {label:'Dates & Events',body:'Plan something real',icon:'calendar-outline' as const,tone:'rose' as PremiumIconTone,onPress:()=>navigate('events')},
    {label:'Executive Circle',body:'Career-minded members',icon:'briefcase-outline' as const,tone:'gold' as PremiumIconTone,onPress:()=>navigate('executive')},
    {label:'Help',body:'Private assistance',icon:'help-circle-outline' as const,tone:'dark' as PremiumIconTone,onPress:()=>navigate('support')},
  ];
  return <SafeAreaView style={{flex:1}}>
    <ScrollView contentContainerStyle={{padding:22,paddingBottom:120,gap:22}}>
      <View style={shared.row}>
        <Text style={shared.h2}>Your profile</Text>
        <View style={shared.spacer}/>
        <Pressable accessibilityRole="button" accessibilityLabel="Open account settings" onPress={()=>setSettingsOpen(true)}>
          <PremiumIcon name="settings-outline" tone="dark" size={42} iconSize={20}/>
        </Pressable>
      </View>
      <LinearGradient colors={['rgba(229,9,47,.24)','rgba(212,175,55,.10)','rgba(255,255,255,.035)']} style={profilePremiumStyles.hero}>
        <View style={profilePremiumStyles.heroGlow}/>
        <View style={profilePremiumStyles.avatarHalo}>
          <View style={profilePremiumStyles.avatarRing}>{profilePhoto?<Image source={{uri:profilePhoto}} style={profilePremiumStyles.avatarPhoto}/>:<Text style={[styles.avatarText,{fontSize:38}]}>{displayName[0]?.toUpperCase()??'D'}</Text>}</View>
          <View style={profilePremiumStyles.statusGem}><MiniPremiumIcon name="diamond" tone="gold" size={30} iconSize={14}/></View>
        </View>
        <View style={profilePremiumStyles.nameRow}><Text style={profilePremiumStyles.name}>{displayName}{displayAge?`, ${displayAge}`:''}</Text>{verified&&<MiniPremiumIcon name="shield-checkmark" tone="plum" size={34} iconSize={16}/>}</View>
        <Text style={profilePremiumStyles.meta}>{displayProfession} · {displayCity}</Text>
        <View style={mediaStyles.mediaBadges}>{verified&&<Chip label="Selfie verified" selected/>}{hasVoiceIntro&&<Chip label="Voice intro" selected/>}<Chip label={isCoupleMode?'Couple Mode':'Serious intent'} gold/></View>
        <View style={profilePremiumStyles.stats}>
          <View style={profilePremiumStyles.stat}><Text style={profilePremiumStyles.statValue}>{profilePhoto?'1 / 3':'0 / 3'}</Text><Text style={profilePremiumStyles.statLabel}>photos</Text></View>
          <View style={profilePremiumStyles.statLine}/>
          <View style={profilePremiumStyles.stat}><Text style={profilePremiumStyles.statValue}>{Math.min(100,profileStrength)}%</Text><Text style={profilePremiumStyles.statLabel}>strength</Text></View>
          <View style={profilePremiumStyles.statLine}/>
          <View style={profilePremiumStyles.stat}><Text style={profilePremiumStyles.statValue}>{lastSeenVisible?'Visible':'Hidden'}</Text><Text style={profilePremiumStyles.statLabel}>activity</Text></View>
        </View>
        <View style={styles.progress}><View style={{width:`${Math.min(100,profileStrength)}%`,height:'100%',backgroundColor:colors.gold}}/></View>
      </LinearGradient>
      <View style={coupleModeStyles.profileModeCard}><View style={shared.row}><PremiumIcon name={isCoupleMode?'heart-circle':'search-circle'} tone={isCoupleMode?'gold':'ruby'} size={48} iconSize={22}/><View style={{flex:1,marginLeft:10}}><Text style={styles.kicker}>APP EXPERIENCE</Text><Text style={styles.cardTitle}>{isCoupleMode?'Using DestinyOne together':'Looking for your person'}</Text><Text style={styles.helper}>{isCoupleMode?`${connectionStatus==='active'&&partnerName?`Connected with ${partnerName}. `:''}Matches, Discover and Likes are hidden.`:'Serious introductions and matching tools are active.'}</Text></View></View><View style={coupleModeStyles.profileModeChoices}><Pressable accessibilityRole="radio" accessibilityState={{checked:!isCoupleMode}} onPress={()=>onModeChange('seeking')} style={[coupleModeStyles.profileModeChoice,!isCoupleMode&&coupleModeStyles.profileModeChoiceOn]}><Ionicons name="search-outline" size={17} color={!isCoupleMode?colors.ivory:colors.muted}/><Text style={[coupleModeStyles.profileModeChoiceText,!isCoupleMode&&{color:colors.ivory}]}>Find my person</Text></Pressable><Pressable accessibilityRole="radio" accessibilityState={{checked:isCoupleMode}} onPress={()=>onModeChange('couple')} style={[coupleModeStyles.profileModeChoice,isCoupleMode&&coupleModeStyles.profileModeChoiceOn]}><Ionicons name="heart-outline" size={17} color={isCoupleMode?colors.gold:colors.muted}/><Text style={[coupleModeStyles.profileModeChoiceText,isCoupleMode&&{color:colors.ivory}]}>With my partner</Text></Pressable></View></View>
      {!isCoupleMode&&<View style={profilePremiumStyles.readinessCard}>
        <View style={shared.row}>
          <View>
            <Text style={styles.kicker}>PROFILE READINESS</Text>
            <Text style={styles.cardTitle}>Make every impression count.</Text>
          </View>
          <View style={profilePremiumStyles.readinessScore}><Text style={profilePremiumStyles.readinessScoreText}>{Math.min(100,profileStrength)}%</Text></View>
        </View>
        <ProfileReadinessItem title="Photos feel real" body={profilePhoto?'Main photo is added. Add 2 more for better trust.':'Add a warm, clear photo before going live.'} done={!!profilePhoto} icon="image-outline"/>
        <ProfileReadinessItem title="Verified trust badge" body={verified?'Verified badge is active.':'Complete selfie verification to reduce drop-offs.'} done={verified} icon="shield-checkmark-outline"/>
        <ProfileReadinessItem title="Voice intro" body={hasVoiceIntro?'Voice intro is ready for Plus members.':'Add a 10-second intro so serious matches feel safer.'} done={hasVoiceIntro} icon="mic-outline"/>
        <Button label={verified?'Open Trust Hub':'Finish verification'} icon="shield-checkmark" variant={verified?'secondary':'gold'} onPress={()=>navigate('verifyHub')}/>
      </View>}
      {!isCoupleMode&&<Pressable accessibilityRole="button" accessibilityLabel="Invite a verified friend and get seven days of Base" onPress={onInvite} style={referralStyles.profileBanner}>
        <LinearGradient colors={['rgba(212,175,55,.18)','rgba(229,9,47,.12)']} style={StyleSheet.absoluteFill}/>
        <PremiumIcon name="gift" tone="gold" size={52} iconSize={24}/>
        <View style={{flex:1}}><Text style={styles.kicker}>DESTINY PASS</Text><Text style={styles.cardTitle}>Invite a friend · Get 7 days</Text><Text style={styles.helper}>Your pass unlocks after their verified profile is complete.</Text></View>
        <MiniPremiumIcon name="chevron-forward" tone="dark" size={32} iconSize={15}/>
      </Pressable>}
      <Pressable onPress={()=>navigate('pricing')} style={styles.plusBanner}>
        <View><Text style={styles.kicker}>DESTINYONE MEMBERSHIP</Text><Text style={styles.plusTitle}>More thoughtful possibilities.</Text></View>
        <PremiumIcon name="arrow-forward-circle" tone="ruby" size={45} iconSize={22}/>
      </Pressable>
      <View style={{gap:11}}><Text style={styles.sectionLabel}>PROFILE & PRIVACY</Text><View style={profilePremiumStyles.actionGrid}>{profileActions.map(action=><Pressable accessibilityRole="button" accessibilityLabel={action.label} onPress={action.onPress} key={action.label} style={profilePremiumStyles.actionTile}><PremiumIcon name={action.icon} tone={action.tone} size={42} iconSize={19}/><Text style={profilePremiumStyles.actionTitle}>{action.label}</Text><Text style={profilePremiumStyles.actionBody}>{action.body}</Text></Pressable>)}</View></View>
      <View style={{gap:11}}><Text style={styles.sectionLabel}>YOUR DESTINYONE</Text><View style={profilePremiumStyles.actionGrid}>{experienceActions.map(action=><Pressable accessibilityRole="button" accessibilityLabel={action.label} onPress={action.onPress} key={action.label} style={profilePremiumStyles.actionTile}><PremiumIcon name={action.icon} tone={action.tone} size={42} iconSize={19}/><Text style={profilePremiumStyles.actionTitle}>{action.label}</Text><Text style={profilePremiumStyles.actionBody}>{action.body}</Text></Pressable>)}</View></View>
      {!showcasePreviewScreen&&<Pressable onPress={onReset} style={styles.resetButton}><MiniPremiumIcon name="log-out-outline" tone="ruby" size={34} iconSize={16}/><Text style={styles.resetText}>{backendMode==='demo'?'Start over':'Sign out'}</Text></Pressable>}
    </ScrollView>
    <ProfileSettingsSheet mode={experienceMode} visible={settingsOpen} onClose={()=>setSettingsOpen(false)} lastSeenVisible={lastSeenVisible} analyticsConsent={analyticsConsent} onLastSeenVisibleChange={onLastSeenVisibleChange} onAnalyticsConsentChange={onAnalyticsConsentChange} navigate={(screen)=>{setSettingsOpen(false);navigate(screen)}}/>
    <BottomNav active="profile" mode={experienceMode} onOpenTool={onOpenTool} navigate={navigate}/>
  </SafeAreaView>
}

function ProfileSettingsSheet({mode,visible,onClose,lastSeenVisible,analyticsConsent,onLastSeenVisibleChange,onAnalyticsConsentChange,navigate}:{mode:ExperienceMode;visible:boolean;onClose:()=>void;lastSeenVisible:boolean;analyticsConsent:boolean;onLastSeenVisibleChange:(value:boolean)=>void;onAnalyticsConsentChange:(value:boolean)=>void;navigate:(s:Screen)=>void}){
  const preview=memberDataRuntime.source==='preview';
  const isCoupleMode=mode==='couple';
  const [notifications,setNotifications]=useState(true);
  const [pauseDiscovery,setPauseDiscovery]=useState(false);
  const [privateMode,setPrivateMode]=useState(false);
  const [settingsStatus,setSettingsStatus]=useState('Your privacy controls are ready.');
  const unavailable=()=>setSettingsStatus('Secure account settings connection required. No local-only change was applied.');
  const toggleNotifications=()=>{if(!preview){unavailable();return}const next=!notifications;setNotifications(next);setSettingsStatus(next?isCoupleMode?'Notifications are on for messages, plans, gifts and calls.':'Notifications are on for matches, Sparks and calls.':'Notifications are off.')};
  const togglePrivateMode=()=>{if(!preview){unavailable();return}const next=!privateMode;setPrivateMode(next);setSettingsStatus(next?'Private profile mode is on. You are hidden from discovery.':'Private profile mode is off. You can appear in discovery again.')};
  const togglePauseDiscovery=()=>{if(!preview){unavailable();return}const next=!pauseDiscovery;setPauseDiscovery(next);setSettingsStatus(next?'Discovery is paused. New daily introductions will wait.':'Discovery is active again.')};
  const toggleLastSeen=()=>{const next=!lastSeenVisible;onLastSeenVisibleChange(next);setSettingsStatus(preview?(next?isCoupleMode?'Last online is visible to your partner.':'Last online is visible to matches.':isCoupleMode?'Last online is hidden from your partner.':'Last online is hidden from matches.'):'Saving visibility through your secure account…')};
  const toggleAnalytics=()=>{const next=!analyticsConsent;onAnalyticsConsentChange(next);setSettingsStatus(preview?(next?'Anonymous product analytics enabled. Private content and profile IDs stay excluded.':'Product analytics disabled. New journey events will not be stored.'):'Saving analytics consent through your secure account…')};
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={[chatStyles.sheet,{maxHeight:'90%'}]}><SheetHeader title="Account settings" subtitle="Privacy, notifications and control" onClose={onClose}/><View style={settingsSheetStyles.hero}><PremiumIcon name="settings" tone="gold" size={50} iconSize={23}/><View style={{flex:1}}><Text style={styles.cardTitle}>Private by default.</Text><Text style={styles.helper}>Your choices can be changed anytime.</Text></View></View><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{gap:9}}><SettingsSwitch icon="notifications-outline" title={isCoupleMode?'Message, plan & call notifications':'Match & message notifications'} body={isCoupleMode?'Get alerts from your connected partner, shared plans, gifts and calls.':'Get alerts for matches, Sparks, calls and support updates.'} value={notifications} onPress={toggleNotifications}/>{!isCoupleMode&&<><SettingsSwitch icon="eye-off-outline" title="Private profile mode" body="Hide from discovery while you review likes and chats." value={privateMode} onPress={togglePrivateMode}/><SettingsSwitch icon="pause-circle-outline" title="Pause discovery" body="Stop appearing in new daily match decks temporarily." value={pauseDiscovery} onPress={togglePauseDiscovery}/></>}<SettingsSwitch icon={lastSeenVisible?'time-outline':'eye-off-outline'} title="Show last online" body={lastSeenVisible?(isCoupleMode?'Your partner can see a recent online hint.':'Matches can see a recent online hint.'):(isCoupleMode?'Last online is hidden from your partner.':'Last online is hidden from matches.')} value={lastSeenVisible} onPress={toggleLastSeen}/><SettingsSwitch icon="analytics-outline" title="Anonymous product analytics" body="Measure stage and consent choices only. Names, profile IDs, messages, photos and precise location are excluded." value={analyticsConsent} onPress={toggleAnalytics}/><View style={settingsSheetStyles.statusCard}><MiniPremiumIcon name={preview?'checkmark-circle':'shield-checkmark-outline'} tone="gold" size={28} iconSize={13}/><Text style={settingsSheetStyles.statusText}>{settingsStatus}</Text></View><View style={settingsSheetStyles.shortcutGrid}><Pressable onPress={()=>navigate('safety')} style={settingsSheetStyles.shortcut}><MiniPremiumIcon name="shield-checkmark-outline" tone="gold" size={30} iconSize={14}/><Text style={settingsSheetStyles.shortcutText}>Safety</Text></Pressable>{!isCoupleMode&&<Pressable onPress={()=>navigate('discovery')} style={settingsSheetStyles.shortcut}><MiniPremiumIcon name="options-outline" tone="rose" size={30} iconSize={14}/><Text style={settingsSheetStyles.shortcutText}>Filters</Text></Pressable>}<Pressable onPress={()=>navigate('support')} style={settingsSheetStyles.shortcut}><MiniPremiumIcon name="help-circle-outline" tone="rose" size={30} iconSize={14}/><Text style={settingsSheetStyles.shortcutText}>Support</Text></Pressable></View><Button label="Done" variant="secondary" onPress={onClose}/></ScrollView></SafeAreaView></Modal>
}

function SettingsSwitch({icon,title,body,value,onPress}:{icon:keyof typeof Ionicons.glyphMap;title:string;body:string;value:boolean;onPress:()=>void}){
  return <Pressable accessibilityRole="switch" accessibilityState={{checked:value}} accessibilityLabel={title} onPress={onPress} style={settingsSheetStyles.switchRow}><PremiumIcon name={icon} tone={value?'gold':'dark'} size={42} iconSize={19}/><View style={{flex:1}}><Text style={settingsSheetStyles.switchTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View><View style={[discoveryStyles.switch,value&&discoveryStyles.switchOn]}><View style={[discoveryStyles.switchThumb,value&&discoveryStyles.switchThumbOn]}/></View></Pressable>
}

function ProfileReadinessItem({title,body,done,icon}:{title:string;body:string;done:boolean;icon:keyof typeof Ionicons.glyphMap}){
  return <View style={profilePremiumStyles.readinessItem}>
    <MiniPremiumIcon name={done?'checkmark-circle':icon} tone={done?'gold':'rose'} size={34} iconSize={16}/>
    <View style={{flex:1}}>
      <Text style={profilePremiumStyles.readinessTitle}>{title}</Text>
      <Text style={styles.helper}>{body}</Text>
    </View>
  </View>
}

function BackendReadyCard({snapshot,providerModules}:{snapshot:ReturnType<typeof getLaunchReadinessSnapshot>;providerModules:readonly AppDataModule[]}){
  const topProviders=providerModules.slice(0,4);
  return <View style={backendReadyStyles.card}>
    <View style={shared.row}>
      <PremiumIcon name="layers-outline" tone="gold" size={48} iconSize={22}/>
      <View style={{flex:1,marginLeft:10}}>
        <Text style={styles.kicker}>BACKEND-READY MAP</Text>
        <Text style={styles.cardTitle}>Data model is ready before API keys.</Text>
        <Text style={styles.helper}>Supabase/API linking will be the final step; app screens now follow production-shaped modules.</Text>
      </View>
    </View>
    <View style={backendReadyStyles.stats}>
      <BackendReadyStat value={`${snapshot.backendReadyModules}/${snapshot.totalModules}`} label="modules"/>
      <BackendReadyStat value={`${snapshot.realtimeModules}`} label="realtime"/>
      <BackendReadyStat value={`${snapshot.adminReviewModules}`} label="admin review"/>
    </View>
    <View style={backendReadyStyles.providerQueue}>
      <Text style={styles.sectionLabel}>PROVIDER QUEUE</Text>
      {topProviders.map(module=><View key={module.key} style={backendReadyStyles.providerRow}>
        <MiniPremiumIcon name={module.adminReview?'shield-checkmark-outline':'flash-outline'} tone={module.adminReview?'gold':'rose'} size={28} iconSize={13}/>
        <View style={{flex:1}}>
          <Text style={backendReadyStyles.providerTitle}>{module.label}</Text>
          <Text style={backendReadyStyles.providerBody}>{module.backendTable}</Text>
        </View>
      </View>)}
    </View>
  </View>
}

function BackendReadyStat({value,label}:{value:string;label:string}){
  return <View style={backendReadyStyles.stat}>
    <Text style={backendReadyStyles.statValue}>{value}</Text>
    <Text style={backendReadyStyles.statLabel}>{label}</Text>
  </View>
}

type SupportInfo = { title: string; body: string; icon: keyof typeof Ionicons.glyphMap; tone?: PremiumIconTone; bullets?: string[]; cta?: 'email' };

function SupportCenter({onBack}:{onBack:()=>void}){
  const [topic,setTopic]=useState('Safety');
  const [caseId,setCaseId]=useState('');
  const [message,setMessage]=useState('');
  const [ticket,setTicket]=useState('');
  const [ticketNote,setTicketNote]=useState('');
  const [supportInfo,setSupportInfo]=useState<SupportInfo|null>(null);
  const [submitting,setSubmitting]=useState(false);
  const submit=async()=>{
    const trimmed=message.trim();
    if(!trimmed)return;
    const isAppeal=topic==='Appeal';
    if(isAppeal&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(caseId.trim())){
      setSupportInfo({title:'Check the case ID',body:'Use the full case ID shown in your moderation decision notice.',icon:'alert-circle-outline',tone:'rose',bullets:['Case IDs protect appeals from being attached to the wrong decision','Do not include another member’s personal details','Contact Safety support if your notice is missing']});
      return;
    }
    if(isAppeal&&trimmed.length<20){
      setSupportInfo({title:'Add a little more detail',body:'Please use at least 20 characters so the reviewer can understand your appeal.',icon:'create-outline',tone:'rose'});
      return;
    }
    const ticketId=`D1-${Date.now().toString().slice(-6)}`;
    setSubmitting(true);
    try{
      const saved=isAppeal
        ? await submitModerationAppeal(caseId.trim(),trimmed)
        : await submitSupportTicket(topic as SupportTopic, trimmed, { app:'DestinyOne', backendMode }, 'support_center');
      const savedId=typeof saved==='string'?saved:typeof saved==='object'&&saved&&'id' in saved?String(saved.id):'';
      const finalId=savedId||ticketId;
      setTicket(finalId);
      setTicketNote(saved?(isAppeal?'Appeal submitted to the independent review queue.':'Saved in Supabase. Support can review this when backend session is active.'):'Saved in preview. Supabase session is needed for real storage.');
      setMessage('');
      if(isAppeal)setCaseId('');
      setSupportInfo({title:isAppeal?'Appeal received':'Support request created',body:`${finalId} · ${topic}`,icon:'checkmark-circle',tone:'gold',bullets:[saved?(isAppeal?'Queued for a qualified reviewer':'Synced to support storage'):'Saved in preview mode',isAppeal?'Submitting an appeal does not expose the reporter’s identity':'You can keep using the app while support reviews it','Sensitive details stay inside the safety/support flow']});
    }catch(error){
      setTicket(ticketId);
      setTicketNote(error instanceof Error?error.message:'Backend ticket storage is not available yet. Saved locally in preview.');
      setMessage('');
      setSupportInfo({title:'Support request saved locally',body:`${ticketId} · ${topic}`,icon:'cloud-offline-outline',tone:'rose',bullets:['Backend ticket storage is not available right now','Your preview ticket is still shown on this screen','Production will retry or store this in Supabase']});
    }finally{
      setSubmitting(false);
    }
  };
  const emailSupport=()=>Linking.openURL(`mailto:support@destinyone.app?subject=${encodeURIComponent(`DestinyOne ${topic} help`)}&body=${encodeURIComponent(message||'Hi DestinyOne team, I need help with ')}`).catch(()=>setSupportInfo({title:'Email support',body:'support@destinyone.app',icon:'mail-outline',tone:'gold',bullets:['Copy this email if your device cannot open mail automatically','Include your ticket ID if you already submitted one','Never send passwords or OTP codes']})); 
  const topics=[
    {label:'Safety',icon:'shield-checkmark-outline' as const,sla:'Priority review'},
    {label:'Appeal',icon:'refresh-circle-outline' as const,sla:'Review a decision'},
    {label:'Billing',icon:'card-outline' as const,sla:'Payments & refunds'},
    {label:'Account',icon:'person-circle-outline' as const,sla:'Profile access'},
    {label:'Report a bug',icon:'bug-outline' as const,sla:'App issue'},
  ] as const;
  const faqs=[
    ['How verification works','Verification photos stay private and help reduce fake profiles.'],
    ['How matching works','Your stated preferences, filters and in-app activity rank matches. We never read phone searches.'],
    ['Refunds and billing','Subscriptions and Spark packs use app-store billing, so users can restore and cancel safely.'],
  ];
  return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}><SafeAreaView style={shared.safe}><View style={supportStyles.header}><Pressable onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable><Text style={[styles.cardTitle,{marginLeft:12}]}>Help & support</Text></View><ScrollView contentContainerStyle={supportStyles.content} showsVerticalScrollIndicator={false}>
    <View style={supportStyles.hero}><PremiumIcon name="headset" tone="ruby" size={68} iconSize={31}/><View style={supportStyles.liveStatus}><View style={supportStyles.liveDot}/><Text style={supportStyles.liveText}>Support preview online</Text></View><Text style={[shared.h1,{textAlign:'center'}]}>We’re here when something feels off.</Text><Text style={[shared.body,{textAlign:'center'}]}>Choose a topic, send a note, or use safety actions. Production connects this page to tickets, moderation and billing support.</Text></View>
    {ticket?<View style={supportStyles.ticketCard}><PremiumIcon name="checkmark-circle" tone="gold" size={44} iconSize={20}/><View style={{flex:1}}><Text style={styles.cardTitle}>Latest ticket: {ticket}</Text><Text style={styles.helper}>{ticketNote||'Saved locally in this preview. Backend step will store tickets in Supabase and notify the support team.'}</Text></View></View>:null}
    <View style={supportStyles.topicGrid}>{topics.map(item=><Pressable key={item.label} onPress={()=>setTopic(item.label)} style={[supportStyles.topicCard,topic===item.label&&supportStyles.topicCardOn]}><PremiumIcon name={item.icon} tone={topic===item.label?'gold':'rose'} size={44} iconSize={20}/><Text style={supportStyles.topicText}>{item.label}</Text><Text style={supportStyles.topicSla}>{item.sla}</Text></Pressable>)}</View>
    <View style={shared.card}><View style={shared.row}><View style={{flex:1}}><Text style={styles.cardTitle}>{topic==='Appeal'?'Request an independent review':'Tell us what happened'}</Text><Text style={styles.helper}>Selected queue: {topic}</Text></View><MiniPremiumIcon name="lock-closed" tone="gold" size={30} iconSize={14}/></View>{topic==='Appeal'?<><Text style={styles.sectionLabel}>CASE ID</Text><TextInput value={caseId} onChangeText={setCaseId} autoCapitalize="none" placeholder="Case ID from your decision notice" placeholderTextColor="#6F6875" style={supportStyles.appealCaseInput}/><Text style={styles.helper}>Only the member affected by an eligible resolved case can appeal. A qualified lead or legal reviewer decides the outcome.</Text></>:null}<TextInput value={message} onChangeText={setMessage} placeholder={topic==='Appeal'?'Explain why the decision should be reviewed...':'Write your message...'} placeholderTextColor="#6F6875" multiline style={supportStyles.messageBox}/><Button disabled={!message.trim()||submitting||(topic==='Appeal'&&!caseId.trim())} label={submitting?'Submitting…':topic==='Appeal'?'Submit appeal':'Submit support request'} icon={topic==='Appeal'?'refresh-circle-outline':'send'} onPress={()=>void submit()}/></View>
    <View style={supportStyles.quickGrid}>
      <SupportQuickCard icon="shield-checkmark-outline" title="Safety guide" body="Dating safety, boundaries and reporting." onPress={()=>setSupportInfo({title:'Safety guide',body:'Small habits make first meetings safer.',icon:'shield-checkmark-outline',tone:'gold',bullets:['Meet in public for early dates','Keep early conversations inside DestinyOne','Use date check-ins and share plans with someone trusted','Report pressure, threats, fake identity or money requests']})}/>
      <SupportQuickCard icon="card-outline" title="Billing help" body="Subscriptions, restore purchase and refunds." onPress={()=>setSupportInfo({title:'Billing help',body:'Payments are designed to stay store-compliant and restorable.',icon:'card-outline',tone:'gold',bullets:['Subscriptions and Spark packs use Apple/Google in-app billing','Members can restore purchases from their store account','Real-world date holds use secure payment partners after venue confirmation','Refund policies follow app-store and payment-provider rules']})}/>
      <SupportQuickCard icon="mail-outline" title="Email team" body="Open a pre-filled support email." onPress={emailSupport}/>
      <SupportQuickCard icon="bug-outline" title="Send diagnostics" body="Preview app/device details for support." onPress={()=>setSupportInfo({title:'Diagnostics ready',body:'Production can attach safe app context without exposing private conversations.',icon:'bug-outline',tone:'rose',bullets:[`Device surface: ${Platform.OS}`,'App area: Support Center','Backend mode and app version only','No passwords, OTPs, photos or message content']})}/>
    </View>
    <View style={{gap:10}}><Text style={styles.sectionLabel}>FAQ</Text>{faqs.map(([title,body])=><View key={title} style={supportStyles.faqCard}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View>)}</View>
  </ScrollView><SupportInfoSheet info={supportInfo} onClose={()=>setSupportInfo(null)} onEmail={emailSupport}/></SafeAreaView></LinearGradient>
}

function SupportQuickCard({icon,title,body,onPress}:{icon:keyof typeof Ionicons.glyphMap;title:string;body:string;onPress:()=>void}){
  return <Pressable onPress={onPress} style={supportStyles.quickCard}>
    <PremiumIcon name={icon} tone="rose" size={42} iconSize={19}/>
    <Text style={supportStyles.quickTitle}>{title}</Text>
    <Text style={supportStyles.quickBody}>{body}</Text>
  </Pressable>
}

function SupportInfoSheet({info,onClose,onEmail}:{info:SupportInfo|null;onClose:()=>void;onEmail:()=>void}){
  if(!info)return null;
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={[chatStyles.sheet,{maxHeight:'82%'}]}><SheetHeader title={info.title} subtitle={info.body} onClose={onClose}/><View style={supportStyles.infoHero}><PremiumIcon name={info.icon} tone={info.tone??'gold'} size={54} iconSize={25}/><View style={{flex:1}}><Text style={styles.cardTitle}>{info.title}</Text><Text style={styles.helper}>{info.body}</Text></View></View>{info.bullets?.length?<View style={supportStyles.infoList}>{info.bullets.map(item=><View key={item} style={supportStyles.infoRow}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={26} iconSize={12}/><Text style={supportStyles.infoText}>{item}</Text></View>)}</View>:null}{info.cta==='email'?<Button label="Email support" icon="mail" variant="gold" onPress={onEmail}/>:<Button label="Got it" onPress={onClose}/>}</SafeAreaView></Modal>
}

function ReferralWelcomeOffer({visible,referralCode,onClose,onViewPlans}:{visible:boolean;referralCode:string;onClose:()=>void;onViewPlans:()=>void}){
  const {width}=useWindowDimensions();
  const [shareStatus,setShareStatus]=useState('');
  const wide=width>=760;
  const wideSheetWidth=Math.min(900,width-32);
  useEffect(()=>{if(visible)setShareStatus('')},[visible]);
  const origin=Platform.OS==='web'&&typeof window!=='undefined'?window.location.origin:'https://destinyone.app';
  const inviteLink=`${origin}/?ref=${encodeURIComponent(referralCode)}`;
  const shareInvite=async()=>{
    const message=`I found DestinyOne, a dating app for people who actually mean it. Join with my private invite and complete your verified profile: ${inviteLink}`;
    try{await Share.share({title:'Your private DestinyOne invite',message});setShareStatus('Invite ready. Your free week unlocks when your friend verifies their profile.')}catch{setShareStatus(`Share is unavailable here. Use this link: ${inviteLink}`)}
  };
  return <Modal visible={visible} transparent animationType={Platform.OS==='web'?'fade':'slide'} onRequestClose={onClose}>
    <View style={referralStyles.modalRoot}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={[chatStyles.sheet,referralStyles.sheet,wide&&referralStyles.sheetWide,wide&&{left:(width-wideSheetWidth)/2,right:undefined,width:wideSheetWidth}]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={referralStyles.scroll}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close referral offer" onPress={onClose} style={referralStyles.close}><Ionicons name="close" size={20} color={colors.ivory}/></Pressable>
        <LinearGradient colors={['#49100F','#18070B']} style={referralStyles.hero}>
          <View style={referralStyles.giftHalo}><PremiumIcon name="gift" tone="gold" size={58} iconSize={27}/></View>
          <Text style={styles.kicker}>BETTER PEOPLE, BETTER MATCHES</Text>
          <Text style={referralStyles.title}>Invite a friend. Unlock a week.</Text>
          <Text style={referralStyles.body}>Bring someone genuine to DestinyOne. When they verify, your Base Pass is on us.</Text>
        </LinearGradient>
        <View style={referralStyles.rewardCard}><View style={referralStyles.rewardTop}><MiniPremiumIcon name="diamond" tone="ruby" size={42} iconSize={19}/><View style={{flex:1}}><Text style={referralStyles.rewardEyebrow}>7 DAYS · $45 VALUE</Text><Text style={referralStyles.rewardTitle}>Your Base Pass, on us</Text></View><Text style={referralStyles.rewardValue}>FREE</Text></View><View style={referralStyles.rewardPills}>{['5 fresh picks daily','Mutual chat','Intent filters','See profile visitors'].map(item=><View key={item} style={referralStyles.rewardPill}><Text style={referralStyles.rewardPillText}>{item}</Text></View>)}</View></View>
        <View style={[referralStyles.steps,wide&&referralStyles.stepsWide]}>{[
          ['1','Send your invite'],['2','They join + verify'],['3','Your free week unlocks'],
        ].map(([number,label])=><View key={number} style={[referralStyles.step,wide&&referralStyles.stepWide]}><View style={referralStyles.stepNumber}><Text style={referralStyles.stepNumberText}>{number}</Text></View><Text style={referralStyles.stepText}>{label}</Text></View>)}</View>
        <View style={referralStyles.codeRow}><View><Text style={referralStyles.codeLabel}>YOUR INVITE CODE</Text><Text style={referralStyles.code}>{referralCode}</Text></View><MiniPremiumIcon name="link" tone="dark" size={34} iconSize={16}/></View>
        {!!shareStatus&&<Text style={referralStyles.status}>{shareStatus}</Text>}
        <View style={[referralStyles.actions,wide&&referralStyles.actionsWide]}><View style={[referralStyles.action,wide&&referralStyles.actionWide]}><Button label="Send my invite" icon="share-social" variant="gold" onPress={()=>void shareInvite()}/></View><View style={[referralStyles.action,wide&&referralStyles.actionWide]}><Button label="Explore plans" icon="diamond-outline" variant="secondary" onPress={onViewPlans}/></View></View>
        <Pressable onPress={onClose} style={referralStyles.later}><Text style={referralStyles.laterText}>Maybe later</Text></Pressable>
        <Text style={styles.legal}>One reward per verified friend. Self-referrals and duplicate accounts are not eligible. Safety and privacy tools remain free for everyone.</Text>
      </ScrollView>
    </SafeAreaView></View>
  </Modal>;
}

function Pricing({back,onInvite,onBuyRoses}:{back:()=>void;onInvite:()=>void;onBuyRoses:(amount?:number)=>void}){
  const [billing,setBilling]=useState<BillingCycle>('monthly');
  const [restoreStatus,setRestoreStatus]=useState(buildRestorePreview([]));
  const [restoring,setRestoring]=useState(false);
  const [billingHelp,setBillingHelp]=useState(false);
  const [sparksOpen,setSparksOpen]=useState(false);
  const [checkout,setCheckout]=useState<{name:string;price:string;period:string;tag:string;features:string[];kind:ProductKind;executive?:boolean;sparkAmount?:number}|null>(null);
  const planAccent:Record<string,string>={Base:'#B43A4B',Plus:colors.gold,Elite:'#FF6E80'};
  const restorePurchases=async()=>{
    setRestoring(true);
    try{
      const result=await restoreStorePurchases();
      const restored=(result?.restored??[]).map(item=>item.key);
      setRestoreStatus(restored.length?buildRestorePreview(restored):'No active store-verified purchases were found for this account.');
    }catch(error){
      setRestoreStatus(error instanceof Error?error.message:'Secure restore is unavailable. No entitlement was changed.');
    }finally{setRestoring(false)}
  };
  return <LinearGradient colors={['#FFFDFC','#F8F0EB',colors.black]} style={{flex:1}}><SafeAreaView style={shared.safe}><Pressable accessibilityRole="button" accessibilityLabel="Close pricing" onPress={back} style={{paddingVertical:10}}><PremiumIcon name="close" tone="dark" size={42} iconSize={20}/></Pressable><ScrollView contentContainerStyle={{gap:20,paddingBottom:30}} showsVerticalScrollIndicator={false}>
    <View style={pricingStyles.hero}><PremiumIcon name="diamond" tone="gold" size={62} iconSize={29}/><Text style={launchStyles.scriptHero}>Memberships</Text><Text style={[shared.h1,{textAlign:'center'}]}>Pay for quality,{`\n`}not for noise.</Text><Text style={[shared.body,{textAlign:'center'}]}>Clear plans for serious dating with privacy, safety and real curation built in.</Text></View>
    <View style={pricingStyles.billingToggle}><Pressable onPress={()=>setBilling('monthly')} style={[pricingStyles.billingOption,billing==='monthly'&&pricingStyles.billingOptionOn]}><Text style={[pricingStyles.billingText,billing==='monthly'&&{color:colors.ivory}]}>Monthly</Text></Pressable><Pressable onPress={()=>setBilling('annual')} style={[pricingStyles.billingOption,billing==='annual'&&pricingStyles.billingOptionOn]}><Text style={[pricingStyles.billingText,billing==='annual'&&{color:colors.ivory}]}>Annual</Text><View style={pricingStyles.saveBadge}><Text style={pricingStyles.saveText}>Save</Text></View></Pressable></View>
    <View style={pricingStyles.promiseGrid}><PricingPromise icon="shield-checkmark" title="Verified-first" body="Profiles, reports and blocks stay safety-led."/><PricingPromise icon="card" title="Store billing" body="Restore purchase and cancel through app stores."/><PricingPromise icon="heart" title="No fake scores" body="Matches use labels and explanations only."/></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Open Destiny Pass referral offer" onPress={onInvite} style={referralStyles.pricingBanner}><PremiumIcon name="gift" tone="gold" size={48} iconSize={22}/><View style={{flex:1}}><Text style={styles.kicker}>DESTINY PASS</Text><Text style={styles.cardTitle}>Invite a verified friend. Get Base free for 7 days.</Text><Text style={styles.helper}>Tap to share your private link. The pass begins after profile verification and referral checks.</Text></View><MiniPremiumIcon name="chevron-forward" tone="dark" size={30} iconSize={14}/></Pressable>
    {membershipPlans.map(plan=>{const price=membershipPriceLabel(plan,billing);const period=billingPeriodLabel(billing);const accent=planAccent[plan.name];return <View key={plan.id} style={[pricingStyles.planCard,{borderColor:accent,backgroundColor:plan.recommended?'#19160F':'#20070D'}]}><View style={shared.row}><PremiumIcon name={plan.name==='Base'?'heart':plan.name==='Plus'?'sparkles':'diamond'} tone={plan.recommended?'gold':'ruby'} size={46} iconSize={22}/><View style={{flex:1,marginLeft:11}}><Text style={styles.kicker}>DESTINYONE {plan.name.toUpperCase()}</Text><Text style={pricingStyles.planFor}>{plan.forLabel}</Text></View><View style={[styles.popular,{backgroundColor:accent}]}><Text style={[styles.popularText,plan.recommended&&{color:'#2A1205'}]}>{plan.tag.toUpperCase()}</Text></View></View><View style={pricingStyles.priceRow}><Text style={styles.price}>{price}</Text><Text style={styles.per}>{period}</Text>{billing==='annual'&&<Text style={pricingStyles.annualNote}>{annualSavingsLabel(plan)}</Text>}</View>{plan.features.slice(0,4).map(x=><View key={x} style={pricingStyles.featureRow}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={30} iconSize={14}/><Text style={[shared.body,{color:colors.ivory,marginLeft:10,flex:1}]}>{x}</Text></View>)}<Button label={plan.cta} variant={plan.recommended?'gold':'secondary'} icon={Platform.OS==='ios'?'logo-apple':'card-outline'} onPress={()=>setCheckout({name:`DestinyOne ${plan.name}`,price,period,tag:plan.tag,features:plan.features,kind:'membership'})}/><View style={launchStyles.secureRow}><MiniPremiumIcon name="lock-closed" tone="gold" size={24} iconSize={11}/><Text style={launchStyles.secureText}>Restore anytime · Cancel in store settings</Text></View></View>})}
    <View style={pricingStyles.executiveCard}><LinearGradient colors={['rgba(245,212,106,.20)','rgba(229,9,47,.08)']} style={StyleSheet.absoluteFill}/><View style={shared.row}><PremiumIcon name="briefcase" tone="gold" size={54} iconSize={25}/><View style={{flex:1,marginLeft:12}}><Text style={styles.kicker}>{executivePlan.tag.toUpperCase()}</Text><Text style={pricingStyles.executiveTitle}>{executivePlan.name}</Text><Text style={pricingStyles.planFor}>{executivePlan.forLabel}</Text></View></View><View style={pricingStyles.priceRow}><Text style={styles.price}>{formatMoney(executivePlan.priceCents)}</Text><Text style={styles.per}>{executivePlan.period}</Text></View>{executivePlan.features.slice(0,3).map(x=><View key={x} style={pricingStyles.featureRow}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={30} iconSize={14}/><Text style={[shared.body,{color:colors.ivory,marginLeft:10,flex:1}]}>{x}</Text></View>)}<Button label={executivePlan.cta} variant="gold" icon="briefcase" onPress={()=>setCheckout({name:executivePlan.name,price:formatMoney(executivePlan.priceCents),period:executivePlan.period,tag:executivePlan.tag,features:executivePlan.features,executive:true,kind:'executive_application'})}/><Text style={styles.helper}>Application approval is required before annual billing. Sensitive verification is private.</Text></View>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:sparksOpen}} onPress={()=>setSparksOpen(value=>!value)} style={pricingStyles.sparkToggle}><PremiumIcon name="sparkles" tone="gold" size={42} iconSize={19}/><View style={{flex:1}}><Text style={styles.cardTitle}>Golden Spark packs</Text><Text style={styles.helper}>Optional extras after your daily free Spark</Text></View><Ionicons name={sparksOpen?'chevron-up':'chevron-down'} size={20} color={colors.gold}/></Pressable>
    {sparksOpen&&<View style={[aiStyles.roseWallet,{alignItems:'flex-start'}]}><View style={aiStyles.roseIcon}><PremiumIcon name="sparkles" tone="gold" size={42} iconSize={19}/></View><View style={{flex:1,gap:7}}><Text style={aiStyles.roseTitle}>Choose a Spark pack</Text><View style={pricingStyles.sparkGrid}>{sparkPacks.map(pack=><Pressable key={pack.id} onPress={()=>setCheckout({name:pack.name,price:formatMoney(pack.priceCents),period:' one-time',tag:pack.tag,features:[`${pack.sparks} Golden Sparks`,'Romantic Spark animation','Restorable store purchase','Abuse and spam limits still apply'],kind:'spark_pack',sparkAmount:pack.sparks})} style={[pricingStyles.sparkCard,pack.bestValue&&pricingStyles.sparkCardBest]}><Text style={pricingStyles.sparkCount}>{pack.sparks}</Text><Text style={pricingStyles.sparkLabel}>Sparks</Text><Text style={pricingStyles.sparkPrice}>{formatMoney(pack.priceCents)}</Text>{pack.bestValue&&<Text style={pricingStyles.sparkBest}>Popular</Text>}</Pressable>)}</View></View></View>}
    <View style={pricingStyles.restoreCard}><PremiumIcon name="refresh-circle" tone="gold" size={44} iconSize={21}/><View style={{flex:1}}><Text style={styles.cardTitle}>Restore purchases</Text><Text style={styles.helper}>{restoreStatus}</Text></View><Pressable disabled={restoring} onPress={()=>void restorePurchases()} style={pricingStyles.restoreButton}><Text style={pricingStyles.restoreText}>{restoring?'Checking…':'Restore'}</Text></Pressable></View>
    <View style={pricingStyles.manageCard}><View style={shared.row}><PremiumIcon name="receipt-outline" tone="rose" size={44} iconSize={21}/><View style={{flex:1,marginLeft:10}}><Text style={styles.cardTitle}>Membership & billing help</Text><Text style={styles.helper}>Manage renewal in your app-store account. Refunds, duplicate charges and chargebacks open a traceable support case.</Text></View></View><Button label={billingHelp?'Hide billing paths':'View billing paths'} variant="secondary" icon="help-circle-outline" onPress={()=>setBillingHelp(value=>!value)}/>{billingHelp&&<View style={pricingStyles.billingHelpBox}>{['Cancel or change renewal in Apple/Google settings','Restore only server-verified purchases','Request refund review with receipt reference','Grace period preserves access while the store retries','Refund or chargeback reverses the entitlement ledger'].map(item=><View key={item} style={pricingStyles.featureRow}><MiniPremiumIcon name="checkmark-circle-outline" tone="gold" size={27} iconSize={13}/><Text style={[shared.body,{flex:1,marginLeft:8,color:colors.ivory}]}>{item}</Text></View>)}</View>}</View>
    <View style={launchStyles.billingPromise}><PremiumIcon name="shield-checkmark" tone="gold" size={44} iconSize={21}/><View style={{flex:1}}><Text style={styles.cardTitle}>Clear payments, no surprises</Text><Text style={styles.helper}>Subscriptions, coins and Spark packs use official in-app billing. Apple Pay is reserved for optional real-world date venue holds.</Text></View></View><Text style={[styles.legal,{paddingBottom:10}]}>Cancel anytime. Your subscription renews through your app store account.</Text></ScrollView><MembershipCheckoutSheet plan={checkout} onClose={()=>setCheckout(null)} onComplete={(sparkAmount)=>sparkAmount?onBuyRoses(sparkAmount):undefined}/></SafeAreaView></LinearGradient>
}

function MembershipCheckoutSheet({plan,onClose,onComplete}:{plan:{name:string;price:string;period:string;tag:string;features:string[];kind:ProductKind;executive?:boolean;sparkAmount?:number}|null;onClose:()=>void;onComplete?:(sparkAmount?:number)=>void}){
  const [stage,setStage]=useState<'review'|'store'|'verifying'|'complete'>('review');
  const [productionError,setProductionError]=useState('');
  useEffect(()=>{if(plan){setStage('review');setProductionError('')}},[plan]);
  if(!plan)return null;
  const steps=checkoutSteps(plan.kind,plan.executive);
  const activeStep=stage==='complete'?steps.length-1:stage==='verifying'?2:stage==='store'?1:0;
  const advance=()=>{
    if(memberDataRuntime.source==='server'){
      setProductionError(plan.executive?'Executive applications are unavailable until secure application review and approval are connected. No request or charge was created.':Platform.OS==='web'?'Membership purchases are available only through the signed iOS or Android app. No charge was created.':'Store billing is not connected in this release. No charge or entitlement was created.');
      return;
    }
    if(stage==='review'){setStage('store');return}
    if(stage==='store'){setStage('verifying');return}
    setStage('complete');
    if(previewEntitlementAllowed(appEnvironment)&&plan.kind==='spark_pack')onComplete?.(plan.sparkAmount);
  };
  const buttonLabel=stage==='review'?(plan.executive?'Review application':'Continue to checkout'):stage==='store'?(plan.executive?'Submit application':'Confirm with app store'):'Finish secure verification';
  const buttonIcon=stage==='review'?(plan.executive?'briefcase':'lock-closed'):stage==='store'?'storefront-outline':'shield-checkmark-outline';
  const successCopy=plan.executive?'Your Executive Circle application is ready for private review. No charge was made.':plan.kind==='spark_pack'?`${plan.sparkAmount??0} Golden Sparks were added for this showcase. No real charge was made.`:'Your membership checkout showcase is complete. No real charge was made.';
  return <Modal visible transparent animationType={Platform.OS==='web'?'fade':'slide'} onRequestClose={onClose}><View style={pricingStyles.checkoutModalRoot}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={[chatStyles.sheet,pricingStyles.checkoutSheet]}><SheetHeader title="Secure checkout" subtitle={`${plan.name} · ${plan.price}${plan.period}`} onClose={onClose}/><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={pricingStyles.checkoutScroll}><LinearGradient colors={plan.executive?['#3B2D09','#1D070B']:plan.kind==='spark_pack'?['#3B2208','#1D070B']:['#3A0710','#1D070B']} style={pricingStyles.checkoutHero}><PremiumIcon name={plan.executive?'briefcase':plan.kind==='spark_pack'?'sparkles':'card'} tone="gold" size={56} iconSize={26}/><View style={{flex:1}}><Text style={styles.kicker}>{plan.tag.toUpperCase()}</Text><Text style={pricingStyles.checkoutTitle}>{plan.name}</Text><Text style={styles.helper}>{plan.price}{plan.period} · billed through your app store</Text></View></LinearGradient><View style={pricingStyles.checkoutSteps}>{steps.map((step,index)=><View key={step} style={pricingStyles.checkoutStep}><View style={[pricingStyles.checkoutStepDot,index<=activeStep&&pricingStyles.checkoutStepDotOn]}><Text style={pricingStyles.checkoutStepNumber}>{index+1}</Text></View><Text style={[pricingStyles.checkoutStepText,index<=activeStep&&pricingStyles.checkoutStepTextOn]}>{step}</Text></View>)}</View><View style={pricingStyles.checkoutFeatureBox}>{plan.features.slice(0,4).map(feature=><View key={feature} style={pricingStyles.featureRow}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={28} iconSize={13}/><Text style={[shared.body,{color:colors.ivory,marginLeft:9,flex:1}]}>{feature}</Text></View>)}</View>{productionError?<View style={pricingStyles.checkoutBlocked}><MiniPremiumIcon name="lock-closed" tone="ruby" size={34} iconSize={16}/><Text style={pricingStyles.checkoutBlockedText}>{productionError}</Text></View>:null}{stage==='complete'?<><View style={pricingStyles.checkoutReady}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={34} iconSize={16}/><Text style={pricingStyles.checkoutReadyText}>{successCopy}</Text></View><Button label="Done" variant="secondary" onPress={onClose}/></>:<Button label={buttonLabel} icon={buttonIcon} variant="gold" onPress={advance}/>}<Text style={styles.legal}>Showcase only. No real payment is collected here.</Text></ScrollView></SafeAreaView></View></Modal>
}

function PricingPromise({icon,title,body}:{icon:keyof typeof Ionicons.glyphMap;title:string;body:string}){
  return <View style={pricingStyles.promiseCard}><MiniPremiumIcon name={icon} tone="gold" size={34} iconSize={16}/><Text style={pricingStyles.promiseTitle}>{title}</Text><Text style={pricingStyles.promiseBody}>{body}</Text></View>
}

function FormPage({children,back,step,scroll: _scroll}:{children:React.ReactNode;back?:()=>void;step?:number;scroll?:boolean}){
  void _scroll;
  const inner=<View style={[shared.content,formPageStyles.content]}>{(back||step)&&<View style={{gap:18}}>{back?<Pressable onPress={back} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable>:<View style={{height:42}}/>}{step&&<StepBar step={step} total={6}/>}</View>}{children}</View>;
  return <LinearGradient colors={['#FFFDFC',colors.black,'#F4E6E4']} locations={[0,.48,1]} style={{flex:1,overflow:'hidden'}}><View style={styles.formGlow}/><SafeAreaView style={shared.safe}><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':Platform.OS==='android'?'height':undefined} style={formPageStyles.keyboard}><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'} showsVerticalScrollIndicator={false} contentContainerStyle={formPageStyles.scrollContent}>{inner}</ScrollView></KeyboardAvoidingView></SafeAreaView></LinearGradient>
}

const formPageStyles=StyleSheet.create({
  keyboard:{flex:1},
  scrollContent:{flexGrow:1,paddingBottom:34},
  content:{flexGrow:1,width:'100%',maxWidth:620,alignSelf:'center',paddingBottom:28},
});
function Segment({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){return <Pressable onPress={onPress} style={[styles.segmentItem,active&&styles.segmentActive]}><Text style={[styles.segmentText,active&&{color:'#FFFDFC'}]}>{label}</Text></Pressable>}
function Info({title,body}:{title:string;body:string}){return <View style={{gap:8}}><Text style={styles.sectionLabel}>{title.toUpperCase()}</Text><Text style={[shared.body,{color:'#D3CED6'}]}>{body}</Text></View>}
function LifeAlignment({match}:{match:Match}){const rows=[['diamond-outline','Marriage outlook',match.timeline],['happy-outline','Family plans',match.children],['people-outline','Family involvement',match.family],['home-outline','Relocation',match.relocation],['chatbubbles-outline','Languages',match.languages.join(' · ')]] as const;return <View style={{gap:10}}><Text style={styles.sectionLabel}>LIFE ALIGNMENT</Text><View style={styles.alignmentCard}>{rows.map(([icon,label,value])=><View key={label} style={styles.alignmentRow}><MiniPremiumIcon name={icon} tone="rose" size={34} iconSize={16}/><View style={{flex:1}}><Text style={styles.alignmentRowLabel}>{label}</Text><Text style={styles.alignmentRowValue}>{value}</Text></View></View>)}</View><Text style={styles.alignmentPrivacy}>Shared to make intentions clear—not to reduce a person to a checklist.</Text><View style={circleStyles.profileVouch}><PremiumIcon name="people" tone="gold" size={46} iconSize={22}/><View style={{flex:1}}><Text style={circleStyles.profileVouchTitle}>Vouched for by {match.vouches.count} friends</Text><Text style={circleStyles.profileVouchBody}>People who know {match.name} describe them as:</Text><View style={circleStyles.qualityWrap}>{match.vouches.qualities.map(quality=><View key={quality} style={circleStyles.qualityPill}><Text style={circleStyles.qualityText}>{quality}</Text></View>)}</View></View></View><Text style={styles.alignmentPrivacy}>Friend vouches confirm character, not identity or safety. Always use your own judgment.</Text></View>}
function BottomNav({active,navigate,mode='seeking',onOpenTool}:{active:string;navigate:(s:Screen)=>void;mode?:ExperienceMode;onOpenTool?:(tool:Exclude<CoupleLaunchTool,null>)=>void}){
  const {width}=useWindowDimensions();
  const compact=width<=360;
  const coupleNavigation=[
    {label:'Together',target:'home' as Screen,icon:'heart' as const,tone:'ruby' as PremiumIconTone},
    {label:'Dates',target:'events' as Screen,icon:'calendar' as const,tone:'gold' as PremiumIconTone},
    {label:'Chat',target:'chat' as Screen,icon:'chatbubble' as const,tone:'ruby' as PremiumIconTone},
    {label:'Gifts',target:'chat' as Screen,icon:'gift' as const,tone:'gold' as PremiumIconTone,tool:'gift' as const},
    {label:'Profile',target:'profile' as Screen,icon:'person' as const,tone:'dark' as PremiumIconTone},
  ];
  const navigationMeta:Record<typeof primaryNavigation[number]['target'],{icon:keyof typeof Ionicons.glyphMap;tone:PremiumIconTone}>={home:{icon:'heart',tone:'ruby'},explore:{icon:'compass',tone:'gold'},chat:{icon:'chatbubble',tone:'ruby'},events:{icon:'calendar',tone:'gold'},executive:{icon:'briefcase',tone:'gold'},profile:{icon:'person',tone:'dark'}};
  const items=mode==='couple'?coupleNavigation:primaryNavigation.map(item=>({...item,...navigationMeta[item.target]}));
  return <View accessibilityRole="tablist" style={bottomNavStyles.nav}><View style={bottomNavStyles.navScroller}>{items.map(item=>{
    const {label,target,icon,tone}=item;
    const selected=active===target||(target==='events'&&active==='events');
    const open=()=>{if('tool' in item&&item.tool){if(onOpenTool)onOpenTool(item.tool);else navigate('chat');return}navigate(target as Screen)};
    return <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{selected}} key={label} onPress={open} style={[bottomNavStyles.navItem,compact&&bottomNavStyles.navItemCompact]}>
      {selected?<PremiumIcon name={icon} tone={tone} size={compact?29:31} iconSize={compact?14:15}/>:<PremiumIcon name={`${icon}-outline` as keyof typeof Ionicons.glyphMap} tone="dark" size={compact?29:31} iconSize={compact?14:15}/>} 
      <Text style={[bottomNavStyles.navText,selected&&bottomNavStyles.navTextOn]}>{label}</Text>
    </Pressable>
  })}</View></View>
}

const selectorStyles=StyleSheet.create({
  searchBox:{minHeight:55,borderRadius:radius.md,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:14},
  searchInput:{flex:1,minHeight:52,color:colors.ivory,fontFamily:'Poppins_400Regular',fontSize:14},
  suggestionPanel:{borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:'rgba(27,9,13,.96)',overflow:'hidden'},
  suggestionRow:{minHeight:42,paddingHorizontal:13,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.04)'},
  suggestionText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:12,color:colors.ivory},
  selectedPill:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:11,paddingVertical:7,borderRadius:17,backgroundColor:'rgba(212,175,55,.12)',borderWidth:1,borderColor:'rgba(212,175,55,.35)'},
  selectedText:{fontFamily:'Poppins_600SemiBold',fontSize:11,color:'#F5DFA9'},
  religionChip:{minHeight:38,paddingHorizontal:12,borderRadius:19,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface2,flexDirection:'row',alignItems:'center',gap:6},
  religionChipOn:{backgroundColor:'#8F1028',borderColor:colors.pinkSoft},
  religionText:{fontFamily:'Poppins_600SemiBold',fontSize:11,color:colors.muted},
  selectField:{gap:7},
  selectButton:{minHeight:57,borderRadius:8,borderWidth:1,borderColor:'rgba(255,255,255,.11)',backgroundColor:'rgba(31,9,14,.92)',flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12,shadowColor:'#000',shadowOpacity:.12,shadowRadius:8},
  selectButtonOn:{borderColor:'rgba(212,175,55,.28)',backgroundColor:'rgba(42,12,18,.94)'},
  selectValue:{flex:1,minWidth:0,fontFamily:'Poppins_600SemiBold',fontSize:12.5,color:colors.ivory},
  selectPlaceholder:{fontFamily:'Poppins_400Regular',color:'#766A73'},
  optionSheet:{maxHeight:'82%',paddingBottom:12},
  citySheet:{height:'88%',maxHeight:780,paddingBottom:12},
  sheetSearch:{minHeight:48,borderRadius:8,borderWidth:1,borderColor:'rgba(255,255,255,.11)',backgroundColor:'rgba(255,255,255,.045)',flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:13},
  sheetSearchInput:{flex:1,minHeight:46,color:colors.ivory,fontFamily:'Poppins_400Regular',fontSize:13},
  optionList:{gap:7,paddingBottom:18},
  optionRow:{minHeight:48,borderRadius:8,borderWidth:1,borderColor:'rgba(255,255,255,.075)',backgroundColor:'rgba(255,255,255,.035)',paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:10},
  optionRowOn:{borderColor:'rgba(212,175,55,.34)',backgroundColor:'rgba(212,175,55,.08)'},
  optionTitle:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:12.5,color:colors.ivory},
  optionBody:{fontFamily:'Poppins_400Regular',fontSize:9.5,color:colors.muted,marginTop:1},
  customOption:{minHeight:55,borderRadius:8,borderWidth:1,borderColor:'rgba(212,175,55,.34)',backgroundColor:'rgba(212,175,55,.08)',paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:10},
  emptyState:{minHeight:118,alignItems:'center',justifyContent:'center',gap:6,padding:16},
  countrySegment:{height:46,borderRadius:8,padding:3,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row'},
  countryOption:{flex:1,borderRadius:6,alignItems:'center',justifyContent:'center'},
  countryOptionOn:{backgroundColor:'#8F1028'},
  countryText:{fontFamily:'Poppins_600SemiBold',fontSize:11.5,color:colors.muted},
  countryTextOn:{color:colors.ivory},
  sheetLabel:{fontFamily:'Poppins_700Bold',fontSize:9,letterSpacing:1.2,color:colors.gold},
  regionBar:{minHeight:56,borderRadius:8,paddingHorizontal:12,backgroundColor:'rgba(212,175,55,.07)',borderWidth:1,borderColor:'rgba(212,175,55,.20)',flexDirection:'row',alignItems:'center',gap:10},
  regionName:{fontFamily:'Poppins_700Bold',fontSize:13,color:colors.ivory,marginTop:2},
  changeRegion:{minHeight:34,paddingHorizontal:12,borderRadius:17,backgroundColor:'rgba(255,255,255,.07)',alignItems:'center',justifyContent:'center'},
  changeRegionText:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:'#F2DCA7'},
  dataNotice:{borderRadius:8,padding:10,backgroundColor:'rgba(212,175,55,.07)',borderWidth:1,borderColor:'rgba(212,175,55,.18)',flexDirection:'row',alignItems:'center',gap:8},
  dataNoticeText:{flex:1,fontFamily:'Poppins_400Regular',fontSize:9.8,lineHeight:14,color:'#DCC9A1'},
});

const authStyles=StyleSheet.create({
  socialGrid:{flexDirection:'row',gap:10},
  socialButton:{flex:1,minHeight:50,borderRadius:25,backgroundColor:'#FFFDFC',borderWidth:1,borderColor:'rgba(255,255,255,.12)',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7,paddingHorizontal:8},
  socialText:{fontFamily:'Poppins_700Bold',fontSize:11,color:colors.ivory},
  socialStatus:{padding:12,borderRadius:18,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:9},
  socialStatusText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:11,color:'#F3DFA7'},
  orRow:{flexDirection:'row',alignItems:'center',gap:10},
  orLine:{flex:1,height:1,backgroundColor:'rgba(255,255,255,.10)'},
  orText:{fontFamily:'Poppins_600SemiBold',fontSize:10,color:colors.muted,textTransform:'uppercase',letterSpacing:0},
});

const premiumIconStyles=StyleSheet.create({
  frame:{alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,255,255,.13)',shadowOpacity:.16,shadowRadius:9,shadowOffset:{width:0,height:5},overflow:'hidden'},
  inner:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(255,255,255,.025)',borderWidth:1,borderColor:'rgba(255,255,255,.07)'},
  shine:{position:'absolute',left:8,top:6,width:'44%',height:'18%',borderRadius:99,backgroundColor:'rgba(255,255,255,.16)',transform:[{rotate:'-18deg'}]},
});

const premiumButtonStyles=StyleSheet.create({
  smallGhost:{minHeight:35,paddingHorizontal:13,borderRadius:18,backgroundColor:'rgba(255,255,255,.065)',borderWidth:1,borderColor:'rgba(255,255,255,.14)',alignItems:'center',justifyContent:'center',shadowColor:'#FF2448',shadowOpacity:.12,shadowRadius:10},
  iconOnly:{marginLeft:10,width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center'},
  rowChevron:{marginLeft:8},
});

const coupleModeStyles=StyleSheet.create({
  modeGrid:{gap:12},
  modeCard:{padding:15,gap:13,borderRadius:8,backgroundColor:'rgba(35,8,14,.92)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',shadowColor:'#000',shadowOpacity:.18,shadowRadius:12},
  modeCardOn:{backgroundColor:'rgba(105,12,32,.72)',borderColor:'rgba(245,201,89,.58)',shadowColor:colors.gold,shadowOpacity:.12,shadowRadius:16},
  modeTag:{fontFamily:'Poppins_700Bold',fontSize:8.5,lineHeight:12,letterSpacing:0,color:colors.gold,marginBottom:2},
  modeTitle:{fontFamily:'Poppins_700Bold',fontSize:15,lineHeight:20,letterSpacing:0,color:colors.ivory},
  modePoints:{flexDirection:'row',flexWrap:'wrap',gap:7,paddingTop:11,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.08)'},
  modePoint:{minHeight:30,paddingHorizontal:9,paddingVertical:6,borderRadius:15,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.07)',flexDirection:'row',alignItems:'center',gap:5},
  modePointOn:{backgroundColor:'rgba(212,175,55,.08)',borderColor:'rgba(212,175,55,.20)'},
  modePointText:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,lineHeight:14,color:'#DFC9CF'},
  modePromise:{padding:13,borderRadius:8,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'center',gap:10},
  setupHero:{alignItems:'center',gap:10,paddingHorizontal:8},
  inviteFound:{padding:13,borderRadius:8,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.26)',flexDirection:'row',alignItems:'center',gap:10},
  inviteFoundTitle:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.ivory},
  setupFields:{gap:14},
  profileSetupCard:{gap:14,padding:15,borderRadius:8,backgroundColor:'rgba(212,175,55,.055)',borderWidth:1,borderColor:'rgba(212,175,55,.22)'},
  phoneSearchCard:{gap:14,padding:15,borderRadius:8,backgroundColor:'rgba(114,11,32,.18)',borderWidth:1,borderColor:'rgba(255,112,132,.20)'},
  partnerResult:{padding:15,borderRadius:8,backgroundColor:'rgba(42,17,7,.92)',borderWidth:1,borderColor:'rgba(212,175,55,.36)',flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:12},
  partnerInitial:{width:48,height:48,borderRadius:24,backgroundColor:'#761027',borderWidth:1,borderColor:'rgba(255,255,255,.20)',alignItems:'center',justifyContent:'center'},
  partnerInitialText:{fontFamily:'Poppins_700Bold',fontSize:20,color:colors.ivory},
  partnerName:{fontFamily:'Poppins_700Bold',fontSize:15,color:colors.ivory,marginRight:6},
  phoneVerified:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:colors.gold,marginTop:3},
  requestCard:{minHeight:76,padding:13,borderRadius:8,backgroundColor:'rgba(212,175,55,.06)',borderWidth:1,borderColor:'rgba(212,175,55,.22)',flexDirection:'row',alignItems:'center',gap:10},
  incomingCard:{gap:13,padding:15,borderRadius:8,backgroundColor:'rgba(87,10,28,.50)',borderWidth:1,borderColor:'rgba(255,112,132,.25)'},
  pendingPill:{paddingHorizontal:9,paddingVertical:6,borderRadius:12,backgroundColor:'rgba(212,175,55,.12)'},
  pendingText:{fontFamily:'Poppins_700Bold',fontSize:8.5,color:colors.gold},
  errorCard:{padding:12,borderRadius:8,backgroundColor:'rgba(169,18,45,.14)',borderWidth:1,borderColor:'rgba(255,93,116,.25)',flexDirection:'row',alignItems:'center',gap:8},
  successCard:{padding:12,borderRadius:8,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:8},
  privateList:{gap:8},
  privateRow:{minHeight:64,padding:12,borderRadius:8,backgroundColor:'rgba(255,255,255,.04)',borderWidth:1,borderColor:'rgba(255,255,255,.07)',flexDirection:'row',alignItems:'center',gap:10},
  privateTitle:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.ivory},
  profileModeCard:{gap:14,padding:15,borderRadius:8,backgroundColor:'rgba(212,175,55,.06)',borderWidth:1,borderColor:'rgba(212,175,55,.24)'},
  profileModeChoices:{minHeight:48,padding:4,borderRadius:8,backgroundColor:'rgba(8,2,4,.72)',flexDirection:'row',gap:5},
  profileModeChoice:{flex:1,minHeight:40,paddingHorizontal:7,borderRadius:6,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
  profileModeChoiceOn:{backgroundColor:'rgba(128,18,40,.86)',borderWidth:1,borderColor:'rgba(212,175,55,.30)'},
  profileModeChoiceText:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.muted,textAlign:'center'},
});

const verificationStyles=StyleSheet.create({
  card:{position:'relative',alignItems:'center',gap:12,padding:20,borderRadius:8,borderWidth:1,borderColor:'rgba(212,175,55,.26)',overflow:'hidden'},
  glow:{position:'absolute',top:-90,width:210,height:210,borderRadius:105,backgroundColor:'rgba(229,9,47,.08)'},
  statusPill:{minHeight:28,paddingHorizontal:10,borderRadius:14,backgroundColor:'rgba(8,2,4,.46)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',flexDirection:'row',alignItems:'center',gap:5},
  statusText:{fontFamily:'Poppins_700Bold',fontSize:8.5,letterSpacing:0,color:'#F1DDA3'},
  title:{fontFamily:'Poppins_700Bold',fontSize:19,lineHeight:25,letterSpacing:0,color:colors.ivory,textAlign:'center'},
  body:{maxWidth:420,fontFamily:'Poppins_400Regular',fontSize:13,lineHeight:19,letterSpacing:0,color:'#D9BEC5',textAlign:'center'},
  idCard:{paddingVertical:14,backgroundColor:'rgba(255,255,255,.035)'},
});

const coupleHomeStyles=StyleSheet.create({
  header:{minHeight:70,paddingHorizontal:18,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:10},
  brand:{fontFamily:'Poppins_700Bold',fontSize:10,letterSpacing:1.6,color:colors.ivory},
  content:{gap:16,paddingHorizontal:16,paddingBottom:116},
  hero:{minHeight:330,padding:22,borderRadius:8,alignItems:'center',justifyContent:'center',gap:10,overflow:'hidden',borderWidth:1,borderColor:'rgba(245,201,89,.34)'},
  heroGlow:{position:'absolute',top:-120,width:280,height:280,borderRadius:140,backgroundColor:'rgba(255,255,255,.055)'},
  avatarPair:{width:150,height:82,marginBottom:4},
  initialAvatar:{position:'absolute',left:4,top:4,width:74,height:74,borderRadius:37,backgroundColor:'#5F0C20',borderWidth:2,borderColor:'rgba(255,255,255,.30)',alignItems:'center',justifyContent:'center'},
  partnerAvatar:{left:72,backgroundColor:'#2E1D09',borderColor:'rgba(245,201,89,.58)'},
  initialText:{fontFamily:'Poppins_700Bold',fontSize:28,color:colors.ivory},
  heartSeal:{position:'absolute',left:61,top:29,width:32,height:32,borderRadius:16,backgroundColor:colors.gold,borderWidth:3,borderColor:'#4B0A19',alignItems:'center',justifyContent:'center',zIndex:3},
  heroEyebrow:{fontFamily:'Poppins_700Bold',fontSize:9,letterSpacing:1.4,color:'#F1D788'},
  heroTitle:{fontFamily:'Satisfy_400Regular',fontSize:29,lineHeight:36,letterSpacing:0,color:colors.ivory,textAlign:'center'},
  heroBody:{maxWidth:560,fontFamily:'Poppins_400Regular',fontSize:12.5,lineHeight:19,color:'#F0D8DE',textAlign:'center'},
  statusPill:{minHeight:32,paddingHorizontal:12,borderRadius:16,backgroundColor:'rgba(8,2,4,.44)',borderWidth:1,borderColor:'rgba(255,255,255,.13)',flexDirection:'row',alignItems:'center',gap:7},
  statusDot:{width:7,height:7,borderRadius:4,backgroundColor:colors.muted},
  statusDotOn:{backgroundColor:'#79D69A'},
  statusText:{fontFamily:'Poppins_700Bold',fontSize:9.5,color:colors.ivory},
  sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  sectionMeta:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:colors.gold},
  actionGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  actionGridWide:{flexWrap:'nowrap'},
  action:{width:'48%',minHeight:164,padding:14,borderRadius:8,backgroundColor:'rgba(30,7,13,.94)',borderWidth:1,borderColor:'rgba(255,255,255,.09)',gap:9},
  actionWide:{flex:1,width:undefined},
  actionTitle:{fontFamily:'Poppins_700Bold',fontSize:13,color:colors.ivory},
  actionBody:{fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:colors.muted,marginTop:3},
  nextPlan:{minHeight:94,padding:15,borderRadius:8,backgroundColor:'rgba(212,175,55,.07)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:12},
  planTitle:{fontFamily:'Poppins_700Bold',fontSize:14,color:colors.ivory,marginTop:2},
  connectionRow:{padding:15,borderRadius:8,backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'center',gap:12},
  connectionTitle:{fontFamily:'Poppins_700Bold',fontSize:12.5,color:colors.ivory,marginBottom:2},
  connectionButton:{minHeight:38,paddingHorizontal:12,borderRadius:19,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.28)',flexDirection:'row',alignItems:'center',gap:6},
  connectionButtonText:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.gold},
});

const bottomNavStyles=StyleSheet.create({
  nav:{position:'absolute',left:10,right:10,bottom:8,minHeight:70,paddingTop:7,paddingBottom:7,backgroundColor:'#210D16',borderWidth:1,borderColor:'#4B2D37',borderRadius:16,shadowColor:'#633044',shadowOpacity:.16,shadowRadius:22,shadowOffset:{width:0,height:9},overflow:'hidden'},
  navScroller:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:8,minWidth:'100%'},
  navItem:{flex:1,minWidth:58,alignItems:'center',justifyContent:'center',gap:1},
  navItemCompact:{minWidth:46},
  inactiveIcon:{width:31,height:31,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  navText:{fontFamily:'Poppins_700Bold',fontSize:7.4,color:colors.muted},
  navTextOn:{color:'#FFFDFC'},
});

const couplesMarketStyles=StyleSheet.create({
  builder:{gap:16,paddingVertical:4},
  choiceRow:{flexDirection:'row',flexWrap:'wrap',gap:8},
  choice:{minHeight:38,paddingHorizontal:14,borderRadius:19,borderWidth:1,borderColor:'rgba(255,255,255,.10)',backgroundColor:'rgba(255,255,255,.045)',alignItems:'center',justifyContent:'center'},
  choiceOn:{backgroundColor:'#85152A',borderColor:'rgba(255,80,105,.55)'},
  choiceText:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:colors.muted},
  budget:{minHeight:38,paddingHorizontal:14,borderRadius:19,borderWidth:1,borderColor:'rgba(212,175,55,.18)',backgroundColor:'rgba(212,175,55,.055)',alignItems:'center',justifyContent:'center'},
  budgetOn:{backgroundColor:'rgba(156,116,18,.42)',borderColor:colors.gold},
  bookingType:{width:190,minHeight:126,padding:13,borderRadius:8,backgroundColor:'rgba(28,8,13,.92)',borderWidth:1,borderColor:'rgba(255,255,255,.09)',gap:6},
  bookingTypeTitle:{fontFamily:'Poppins_700Bold',fontSize:11,color:colors.ivory},
  bookingTypeBody:{fontFamily:'Poppins_400Regular',fontSize:9.3,lineHeight:14,color:colors.muted},
  generated:{gap:12,paddingTop:15,borderTopWidth:1,borderTopColor:'rgba(212,175,55,.22)'},
  itinerary:{gap:8},
  itineraryRow:{minHeight:40,flexDirection:'row',alignItems:'center',gap:9},
  stepNumber:{width:26,height:26,borderRadius:13,backgroundColor:'rgba(212,175,55,.13)',borderWidth:1,borderColor:'rgba(212,175,55,.30)',alignItems:'center',justifyContent:'center'},
  stepNumberText:{fontFamily:'Poppins_700Bold',fontSize:9,color:'#F3D894'},
  itineraryText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:11,color:'#EED8DD'},
  policyRow:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:11,paddingVertical:9,borderRadius:8,backgroundColor:'rgba(255,255,255,.035)'},
  policyText:{flex:1,fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:colors.muted},
  startOver:{alignSelf:'center',paddingHorizontal:12,paddingVertical:8},
  startOverText:{fontFamily:'Poppins_600SemiBold',fontSize:10,color:colors.pinkSoft},
  tonightImage:{width:48,height:48,borderRadius:6,backgroundColor:colors.surface2},
  placePhotoWrap:{height:210,width:'100%',position:'relative',justifyContent:'flex-end',backgroundColor:colors.surface2},
  placePhotoCompact:{height:160},
  placePhoto:{position:'absolute',left:0,right:0,top:0,bottom:0,width:'100%',height:'100%'},
  photoBadges:{position:'absolute',left:10,top:10,flexDirection:'row',gap:6},
  distanceBadge:{minHeight:28,paddingHorizontal:8,borderRadius:14,backgroundColor:'rgba(10,2,5,.82)',borderWidth:1,borderColor:'rgba(255,255,255,.16)',flexDirection:'row',alignItems:'center',gap:4},
  distanceText:{fontFamily:'Poppins_700Bold',fontSize:8.5,color:colors.ivory},
  priceBadge:{minHeight:28,paddingHorizontal:10,borderRadius:14,backgroundColor:'rgba(142,15,40,.88)',alignItems:'center',justifyContent:'center'},
  priceBadgeText:{fontFamily:'Poppins_700Bold',fontSize:9,color:colors.ivory},
  photoSave:{position:'absolute',right:10,top:9},
  photoTitle:{padding:13,gap:2},
  photoKind:{fontFamily:'Poppins_700Bold',fontSize:8,letterSpacing:1.1,color:'#F1D18A'},
  photoName:{fontFamily:'Poppins_700Bold',fontSize:18,lineHeight:23,color:colors.ivory},
  photoMeta:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:'#E6CED4'},
  placeContent:{padding:13,gap:9},
  detailPhotoWrap:{height:210,borderRadius:8,overflow:'hidden',position:'relative',justifyContent:'flex-end',backgroundColor:colors.surface2},
  detailPhoto:{position:'absolute',left:0,right:0,top:0,bottom:0,width:'100%',height:'100%'},
  detailPhotoCopy:{padding:15,gap:4},
  detailPhotoTitle:{fontFamily:'Poppins_700Bold',fontSize:17,lineHeight:23,color:colors.ivory},
  checkoutHero:{padding:14,borderRadius:8,backgroundColor:'rgba(212,175,55,.075)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:12},
  checkoutItems:{gap:8},
  checkoutItem:{minHeight:58,paddingHorizontal:12,paddingVertical:9,borderRadius:8,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.07)',flexDirection:'row',alignItems:'center',gap:9},
  checkoutItemTitle:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:colors.ivory},
  checkoutItemMeta:{fontFamily:'Poppins_400Regular',fontSize:8.8,color:colors.muted,marginTop:2},
  paymentRow:{flexDirection:'row',gap:8},
  paymentChoice:{flex:1,minHeight:48,paddingHorizontal:6,borderRadius:8,borderWidth:1,borderColor:'rgba(255,255,255,.09)',backgroundColor:'rgba(255,255,255,.04)',alignItems:'center',justifyContent:'center',gap:3},
  paymentChoiceOn:{borderColor:colors.gold,backgroundColor:'rgba(212,175,55,.10)'},
  paymentText:{fontFamily:'Poppins_600SemiBold',fontSize:8.5,color:colors.muted,textAlign:'center'},
  totalRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:4},
  totalPrice:{fontFamily:'Poppins_700Bold',fontSize:22,color:colors.gold},
});

const gameStyles=StyleSheet.create({
  hero:{padding:14,borderRadius:22,backgroundColor:'rgba(122,31,224,.10)',borderWidth:1,borderColor:'rgba(122,31,224,.30)',flexDirection:'row',alignItems:'center',gap:12},
  grid:{gap:10,paddingBottom:8},
  card:{minHeight:82,padding:13,borderRadius:22,backgroundColor:'#210710',borderWidth:1,borderColor:'rgba(255,255,255,.10)',flexDirection:'row',alignItems:'center',gap:12},
  icon:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center',shadowColor:'#FF2448',shadowOpacity:.18,shadowRadius:12},
  title:{fontFamily:'Poppins_700Bold',fontSize:13,color:colors.ivory},
  body:{fontFamily:'Poppins_400Regular',fontSize:10.5,lineHeight:15,color:'#D7B8C0',marginTop:3},
});

const coupleStyles=StyleSheet.create({
  scrollContent:{gap:16,paddingBottom:18},
  preview:{minHeight:92,borderRadius:26,padding:14,flexDirection:'row',alignItems:'center',gap:12,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,255,255,.16)'},
  previewAvatar:{width:58,height:58,borderRadius:29,borderWidth:2,borderColor:'rgba(255,255,255,.35)'},
  previewName:{fontFamily:'Poppins_700Bold',fontSize:18,color:colors.ivory},
  previewMeta:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:'rgba(255,248,244,.78)',marginTop:2},
  section:{gap:10},
  nicknameRow:{flexDirection:'row',gap:9,alignItems:'center'},
  nicknameInput:{flex:1,height:50,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface,color:colors.ivory,paddingHorizontal:14,fontFamily:'Poppins_400Regular',fontSize:13},
  saveButton:{height:50,paddingHorizontal:17,borderRadius:18,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center'},
  saveText:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.ivory},
  themeGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},
  themeCard:{width:'48%',minHeight:70,borderRadius:20,padding:11,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'center',gap:9},
  themeDot:{width:32,height:32,borderRadius:16,borderWidth:1,borderColor:'rgba(255,255,255,.20)'},
  themeName:{flex:1,fontFamily:'Poppins_700Bold',fontSize:10.5,color:colors.ivory},
  statusCard:{padding:10,borderRadius:16,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:8},
  statusText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:10.5,lineHeight:15,color:'#F0DCA6'},
  privacyChoice:{minHeight:68,padding:12,borderRadius:18,backgroundColor:'rgba(255,255,255,.04)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'center',gap:10},
  privacyChoiceOn:{backgroundColor:'rgba(212,175,55,.09)',borderColor:'rgba(212,175,55,.34)'},
  privacyTitle:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.ivory},
  privacyBody:{fontFamily:'Poppins_400Regular',fontSize:10,lineHeight:15,color:'#CDB5BB',marginTop:2},
  captureCard:{padding:13,borderRadius:20,backgroundColor:'#1D090E',borderWidth:1,borderColor:'rgba(212,175,55,.22)',flexDirection:'row',alignItems:'center',gap:11},
  toggle:{width:44,height:26,borderRadius:13,padding:3,backgroundColor:'rgba(255,255,255,.13)'},
  toggleOn:{backgroundColor:'#8F1028'},
  toggleKnob:{width:20,height:20,borderRadius:10,backgroundColor:'#A9959B'},
  toggleKnobOn:{alignSelf:'flex-end',backgroundColor:colors.ivory},
  limitCard:{padding:11,borderRadius:16,backgroundColor:'rgba(229,9,47,.06)',borderWidth:1,borderColor:'rgba(229,9,47,.18)',flexDirection:'row',alignItems:'flex-start',gap:8},
  limitText:{flex:1,fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:'#D7B8C0'},
});

const privacyStyles=StyleSheet.create({
  card:{padding:15,borderRadius:24,backgroundColor:'#1D090E',borderWidth:1,borderColor:'rgba(212,175,55,.22)',flexDirection:'row',gap:12,alignItems:'flex-start'},
  icon:{width:43,height:43,borderRadius:22,backgroundColor:'rgba(212,175,55,.10)',alignItems:'center',justifyContent:'center'},
  toggleRow:{flexDirection:'row',gap:8,marginTop:11},
  toggle:{height:34,minWidth:72,borderRadius:17,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.line,backgroundColor:'rgba(255,255,255,.05)'},
  toggleOn:{backgroundColor:'#8F1028',borderColor:colors.pinkSoft},
  toggleText:{fontFamily:'Poppins_700Bold',fontSize:10.5,color:colors.muted},
  toggleTextOn:{color:colors.ivory},
});

const settingsSheetStyles=StyleSheet.create({
  hero:{padding:14,borderRadius:22,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:12},
  switchRow:{padding:13,borderRadius:19,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'center',gap:11},
  switchTitle:{fontFamily:'Poppins_700Bold',fontSize:12.5,color:colors.ivory,marginBottom:2},
  statusCard:{padding:11,borderRadius:17,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:8},
  statusText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:10.5,lineHeight:15,color:'#EED8AC'},
  shortcutGrid:{flexDirection:'row',gap:8},
  shortcut:{flex:1,minHeight:70,borderRadius:18,backgroundColor:'rgba(255,255,255,.05)',borderWidth:1,borderColor:'rgba(255,255,255,.09)',alignItems:'center',justifyContent:'center',gap:6},
  shortcutText:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.ivory},
});

const trustHubStyles=StyleSheet.create({
  badgeGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  badgeCard:{flexGrow:1,flexBasis:'31%',minWidth:128,minHeight:116,borderRadius:20,padding:12,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',gap:7},
  badgeCardOn:{backgroundColor:'rgba(212,175,55,.09)',borderColor:'rgba(212,175,55,.30)'},
  badgeTitle:{fontFamily:'Poppins_700Bold',fontSize:10.8,lineHeight:15,color:colors.ivory},
  badgeBody:{fontFamily:'Poppins_400Regular',fontSize:8.8,lineHeight:13,color:colors.muted},
  statusCard:{padding:13,borderRadius:20,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:9},
  statusText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:11,lineHeight:16,color:'#F2DDAF'},
  consentCard:{padding:15,borderRadius:24,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'center',gap:12},
  consentCardOn:{backgroundColor:'rgba(212,175,55,.08)',borderColor:'rgba(212,175,55,.30)'},
  actionGrid:{gap:10},
  actionCard:{padding:14,borderRadius:22,backgroundColor:'#1A080C',borderWidth:1,borderColor:'rgba(255,255,255,.09)',flexDirection:'row',alignItems:'center',gap:12},
  actionTitle:{fontFamily:'Poppins_700Bold',fontSize:12.5,color:colors.ivory,marginBottom:3},
  actionButton:{minWidth:94,height:38,paddingHorizontal:12,borderRadius:19,backgroundColor:'rgba(229,9,47,.16)',borderWidth:1,borderColor:'rgba(229,9,47,.38)',alignItems:'center',justifyContent:'center'},
  actionButtonText:{fontFamily:'Poppins_700Bold',fontSize:10.5,color:'#FF8BA0'},
  privacyPanel:{padding:15,borderRadius:22,backgroundColor:'rgba(212,175,55,.075)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:12},
});

const adminOpsStyles=StyleSheet.create({
  statGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  stat:{flexGrow:1,flexBasis:'22%',minWidth:112,minHeight:76,borderRadius:20,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',alignItems:'center',justifyContent:'center',padding:10},
  statValue:{fontFamily:'Poppins_700Bold',fontSize:21,color:colors.ivory},
  statLabel:{fontFamily:'Poppins_600SemiBold',fontSize:8.8,color:'#CDB5BB',marginTop:2,textAlign:'center'},
  statusCard:{padding:13,borderRadius:20,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:9},
  statusText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:11,lineHeight:16,color:'#F1DDAF'},
  qualityCard:{gap:12,padding:15,borderRadius:26,backgroundColor:'rgba(212,175,55,.07)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',shadowColor:colors.gold,shadowOpacity:.08,shadowRadius:16},
  qualityTitle:{fontFamily:'Poppins_700Bold',fontSize:19,color:colors.ivory,marginTop:2},
  qualityScore:{fontFamily:'Poppins_700Bold',fontSize:26,color:colors.gold},
  qualityTrack:{height:6,borderRadius:3,backgroundColor:'rgba(255,255,255,.10)',overflow:'hidden'},
  qualityFill:{height:'100%',borderRadius:3,backgroundColor:colors.gold},
  qualityRows:{gap:8},
  qualityRow:{padding:10,borderRadius:17,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'flex-start',gap:8},
  qualityRowTitle:{fontFamily:'Poppins_700Bold',fontSize:11.2,color:colors.ivory},
  qualityRowBody:{fontFamily:'Poppins_400Regular',fontSize:9.3,lineHeight:14,color:'#CDB5BB',marginTop:1},
  nextTiny:{fontFamily:'Poppins_600SemiBold',fontSize:8.8,lineHeight:13,color:'#EED8AC',marginTop:4},
  backendLaunchCard:{gap:12,padding:15,borderRadius:26,backgroundColor:'rgba(37,8,14,.94)',borderWidth:1,borderColor:'rgba(212,175,55,.25)',shadowColor:colors.gold,shadowOpacity:.09,shadowRadius:16},
  paymentEntitlementCard:{gap:12,padding:15,borderRadius:26,backgroundColor:'rgba(55,7,16,.92)',borderWidth:1,borderColor:'rgba(229,9,47,.28)',shadowColor:colors.pink,shadowOpacity:.08,shadowRadius:16},
  notificationCard:{gap:12,padding:15,borderRadius:26,backgroundColor:'rgba(34,9,39,.90)',borderWidth:1,borderColor:'rgba(255,139,160,.22)',shadowColor:'#7A1FE0',shadowOpacity:.08,shadowRadius:16},
  giftFulfillmentCard:{gap:12,padding:15,borderRadius:26,backgroundColor:'rgba(48,18,7,.92)',borderWidth:1,borderColor:'rgba(212,175,55,.26)',shadowColor:colors.gold,shadowOpacity:.08,shadowRadius:16},
  placesReservationCard:{gap:12,padding:15,borderRadius:26,backgroundColor:'rgba(18,35,32,.90)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',shadowColor:'#45C2A4',shadowOpacity:.08,shadowRadius:16},
  observabilityCard:{gap:12,padding:15,borderRadius:26,backgroundColor:'rgba(22,15,42,.90)',borderWidth:1,borderColor:'rgba(139,117,255,.24)',shadowColor:'#8B75FF',shadowOpacity:.08,shadowRadius:16},
  abuseFraudCard:{gap:12,padding:15,borderRadius:26,backgroundColor:'rgba(39,8,12,.92)',borderWidth:1,borderColor:'rgba(255,107,130,.24)',shadowColor:'#FF4968',shadowOpacity:.08,shadowRadius:16},
  trustOpsCard:{gap:12,padding:15,borderRadius:26,backgroundColor:'rgba(229,9,47,.06)',borderWidth:1,borderColor:'rgba(212,175,55,.22)',shadowColor:colors.gold,shadowOpacity:.08,shadowRadius:16},
  legalOpsCard:{gap:12,padding:15,borderRadius:26,backgroundColor:'rgba(212,175,55,.065)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',shadowColor:colors.gold,shadowOpacity:.10,shadowRadius:16},
  interactionCard:{gap:12,padding:15,borderRadius:26,backgroundColor:'rgba(229,9,47,.055)',borderWidth:1,borderColor:'rgba(229,9,47,.22)',shadowColor:colors.pink,shadowOpacity:.08,shadowRadius:16},
  areaGrid:{flexDirection:'row',flexWrap:'wrap',gap:7},
  areaPill:{flexGrow:1,minWidth:92,paddingHorizontal:10,paddingVertical:8,borderRadius:16,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  areaLabel:{fontFamily:'Poppins_700Bold',fontSize:8.5,color:'#F1C8D0',textTransform:'capitalize'},
  areaScore:{fontFamily:'Poppins_700Bold',fontSize:14,color:colors.ivory,marginTop:2},
  interactionNotice:{padding:11,borderRadius:18,backgroundColor:'rgba(212,175,55,.075)',borderWidth:1,borderColor:'rgba(212,175,55,.22)',flexDirection:'row',alignItems:'center',gap:8},
  interactionNoticeText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:10,lineHeight:15,color:'#F0DDB0'},
  releaseCard:{gap:12,padding:15,borderRadius:26,backgroundColor:'rgba(122,31,224,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',shadowColor:'#7A1FE0',shadowOpacity:.08,shadowRadius:16},
  nextOpsCard:{padding:11,borderRadius:18,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.22)',flexDirection:'row',alignItems:'center',gap:8},
  nextOpsText:{flex:1,fontFamily:'Poppins_700Bold',fontSize:10.5,lineHeight:15,color:'#F0DDB0'},
  storeCriticalPill:{height:22,paddingHorizontal:8,borderRadius:11,backgroundColor:'rgba(229,9,47,.16)',borderWidth:1,borderColor:'rgba(229,9,47,.34)',alignItems:'center',justifyContent:'center'},
  storeCriticalText:{fontFamily:'Poppins_700Bold',fontSize:7.8,color:'#FFD7DC'},
  releaseMeterRow:{flexDirection:'row',gap:8},
  releaseMeter:{flex:1,gap:7,padding:10,borderRadius:18,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  releaseMeterLabel:{fontFamily:'Poppins_700Bold',fontSize:10,color:'#EBD0D7'},
  releaseMeterValue:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.gold},
  releaseList:{gap:8},
  releaseListTitle:{fontFamily:'Poppins_700Bold',fontSize:10,letterSpacing:1.2,textTransform:'uppercase',color:colors.pinkSoft},
  releaseGateRow:{padding:10,borderRadius:17,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'flex-start',gap:8},
  tabRow:{flexDirection:'row',gap:8,padding:6,borderRadius:24,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  tab:{flex:1,minHeight:42,borderRadius:19,alignItems:'center',justifyContent:'center',paddingHorizontal:8},
  tabOn:{backgroundColor:colors.pink,shadowColor:colors.pink,shadowOpacity:.22,shadowRadius:14},
  tabText:{fontFamily:'Poppins_700Bold',fontSize:10.5,color:'#C7AEB6'},
  caseCard:{gap:12,padding:15,borderRadius:24,backgroundColor:'#19070B',borderWidth:1,borderColor:'rgba(255,255,255,.09)',shadowColor:colors.pink,shadowOpacity:.08,shadowRadius:14},
  caseMeta:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:'#BDA3AB',textTransform:'capitalize',marginTop:2},
  riskDot:{width:12,height:12,borderRadius:6,marginRight:9,backgroundColor:'#5B5660'},
  riskPill:{paddingHorizontal:10,height:28,borderRadius:14,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,255,255,.12)'},
  riskText:{fontFamily:'Poppins_700Bold',fontSize:9.5,color:colors.ivory},
  riskLow:{backgroundColor:'rgba(88,201,128,.22)',borderColor:'rgba(88,201,128,.36)'},
  riskMedium:{backgroundColor:'rgba(212,175,55,.24)',borderColor:'rgba(212,175,55,.38)'},
  riskHigh:{backgroundColor:'rgba(229,9,47,.30)',borderColor:'rgba(229,9,47,.48)'},
  riskCritical:{backgroundColor:'rgba(228,107,114,.40)',borderColor:'rgba(255,185,190,.58)'},
  evidenceWrap:{flexDirection:'row',flexWrap:'wrap',gap:6},
  evidencePill:{paddingHorizontal:9,paddingVertical:6,borderRadius:14,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.20)'},
  evidenceText:{fontFamily:'Poppins_600SemiBold',fontSize:8.8,color:'#EFD8A8'},
  caseFooter:{flexDirection:'row',flexWrap:'wrap',gap:7},
  statusPill:{height:28,paddingHorizontal:10,borderRadius:14,backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',alignItems:'center',justifyContent:'center'},
  statusPillText:{fontFamily:'Poppins_700Bold',fontSize:9,color:'#EED7DD'},
  reviewPill:{height:28,paddingHorizontal:10,borderRadius:14,backgroundColor:'rgba(212,175,55,.10)',borderWidth:1,borderColor:'rgba(212,175,55,.26)',alignItems:'center',justifyContent:'center'},
  reviewText:{fontFamily:'Poppins_700Bold',fontSize:9,color:'#F1DFA8'},
  autoPill:{height:28,paddingHorizontal:10,borderRadius:14,backgroundColor:'rgba(228,107,114,.12)',borderWidth:1,borderColor:'rgba(228,107,114,.30)',alignItems:'center',justifyContent:'center'},
  autoText:{fontFamily:'Poppins_700Bold',fontSize:9,color:'#FFD0D6'},
  actionRow:{flexDirection:'row',flexWrap:'wrap',gap:8},
  ghostAction:{flexGrow:1,minWidth:88,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',alignItems:'center',justifyContent:'center',paddingHorizontal:10},
  ghostActionText:{fontFamily:'Poppins_700Bold',fontSize:10,color:'#E9CBD2'},
  primaryAction:{flexGrow:1,minWidth:92,height:38,borderRadius:19,backgroundColor:colors.pink,borderWidth:1,borderColor:'#FF4465',alignItems:'center',justifyContent:'center',paddingHorizontal:10},
  primaryActionText:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.ivory},
  reportCard:{gap:9,padding:14,borderRadius:22,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  timeText:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:colors.muted},
  reportDetails:{fontFamily:'Poppins_400Regular',fontSize:11.5,lineHeight:17,color:'#F0D4DA',padding:11,borderRadius:15,backgroundColor:'rgba(0,0,0,.18)'},
  reportFooter:{paddingTop:2},
  footerText:{fontFamily:'Poppins_600SemiBold',fontSize:9.2,color:'#9F8790'},
  emptyCard:{gap:8,alignItems:'center',padding:18,borderRadius:24,backgroundColor:'rgba(212,175,55,.06)',borderWidth:1,borderColor:'rgba(212,175,55,.18)'},
});

const profilePremiumStyles=StyleSheet.create({
  hero:{alignItems:'center',gap:10,padding:18,borderRadius:30,borderWidth:1,borderColor:'rgba(255,255,255,.13)',overflow:'hidden',shadowColor:'#FF2448',shadowOpacity:.20,shadowRadius:24,shadowOffset:{width:0,height:12}},
  heroGlow:{position:'absolute',width:220,height:220,borderRadius:110,top:-80,right:-70,backgroundColor:'rgba(229,9,47,.20)'},
  avatarHalo:{width:118,height:118,borderRadius:59,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(212,175,55,.10)',borderWidth:1,borderColor:'rgba(212,175,55,.26)',shadowColor:colors.gold,shadowOpacity:.28,shadowRadius:20},
  avatarRing:{width:98,height:98,borderRadius:49,backgroundColor:'#6D1022',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'rgba(255,255,255,.25)',overflow:'hidden'},
  avatarPhoto:{width:'100%',height:'100%'},
  statusGem:{position:'absolute',right:4,bottom:6},
  nameRow:{flexDirection:'row',alignItems:'center',gap:8},
  name:{fontFamily:'Poppins_700Bold',fontSize:25,color:colors.ivory},
  meta:{fontFamily:'Poppins_400Regular',fontSize:12.5,color:'#E4CAD0'},
  stats:{width:'100%',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:10,paddingHorizontal:8,borderRadius:20,backgroundColor:'rgba(0,0,0,.20)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',marginTop:2},
  stat:{flex:1,alignItems:'center'},
  statValue:{fontFamily:'Poppins_700Bold',fontSize:15,color:colors.ivory},
  statLabel:{fontFamily:'Poppins_600SemiBold',fontSize:8.5,color:'#CDB5BB',marginTop:2,textAlign:'center'},
  statLine:{width:1,height:30,backgroundColor:'rgba(255,255,255,.12)'},
  readinessCard:{gap:13,padding:16,borderRadius:26,backgroundColor:'#211014',borderWidth:1,borderColor:'rgba(212,175,55,.22)',shadowColor:colors.gold,shadowOpacity:.10,shadowRadius:14},
  readinessScore:{width:54,height:54,borderRadius:27,backgroundColor:'rgba(212,175,55,.14)',borderWidth:1,borderColor:'rgba(212,175,55,.34)',alignItems:'center',justifyContent:'center'},
  readinessScoreText:{fontFamily:'Poppins_700Bold',fontSize:14,color:colors.gold},
  readinessItem:{flexDirection:'row',alignItems:'flex-start',gap:10,padding:12,borderRadius:18,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.075)'},
  readinessTitle:{fontFamily:'Poppins_700Bold',fontSize:12.5,color:colors.ivory,marginBottom:2},
  actionGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  actionTile:{flexGrow:1,flexBasis:'47%',minWidth:145,minHeight:112,padding:13,borderRadius:8,backgroundColor:'rgba(255,255,255,.04)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',justifyContent:'space-between'},
  actionTitle:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.ivory,marginTop:10},
  actionBody:{fontFamily:'Poppins_400Regular',fontSize:9.2,lineHeight:13.5,color:colors.muted,marginTop:2},
  shareStatus:{marginTop:-12,padding:12,borderRadius:18,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.22)',flexDirection:'row',alignItems:'center',gap:9},
  shareStatusText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:10.8,lineHeight:16,color:'#EFD8B0'},
});

const backendReadyStyles=StyleSheet.create({
  card:{gap:14,padding:16,borderRadius:26,backgroundColor:'#19090D',borderWidth:1,borderColor:'rgba(212,175,55,.24)',shadowColor:colors.gold,shadowOpacity:.08,shadowRadius:16},
  stats:{flexDirection:'row',gap:8},
  stat:{flex:1,minHeight:64,borderRadius:18,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.075)',alignItems:'center',justifyContent:'center',padding:8},
  statValue:{fontFamily:'Poppins_700Bold',fontSize:16,color:colors.ivory},
  statLabel:{fontFamily:'Poppins_600SemiBold',fontSize:8.8,color:'#CDB5BB',marginTop:2,textAlign:'center'},
  providerQueue:{gap:8},
  providerRow:{flexDirection:'row',alignItems:'center',gap:9,padding:10,borderRadius:16,backgroundColor:'rgba(212,175,55,.055)',borderWidth:1,borderColor:'rgba(212,175,55,.15)'},
  providerTitle:{fontFamily:'Poppins_700Bold',fontSize:11.5,color:colors.ivory},
  providerBody:{fontFamily:'Poppins_400Regular',fontSize:9.2,lineHeight:13,color:'#BFA9AF',marginTop:1},
});

const profileSetupStyles=StyleSheet.create({
  photoSection:{gap:10},
  photoHeader:{flexDirection:'row',alignItems:'center',gap:12},
  photoCount:{minWidth:42,height:28,paddingHorizontal:9,borderRadius:14,backgroundColor:'rgba(212,175,55,.10)',borderWidth:1,borderColor:'rgba(212,175,55,.28)',alignItems:'center',justifyContent:'center'},
  photoCountText:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.gold},
  photoDesktop:{aspectRatio:undefined,height:210},
  photoEmpty:{alignItems:'center',justifyContent:'center',gap:4,paddingHorizontal:5},
  photoPrompt:{fontFamily:'Poppins_700Bold',fontSize:10.5,lineHeight:14,color:colors.ivory,textAlign:'center'},
  photoHint:{fontFamily:'Poppins_400Regular',fontSize:8.5,lineHeight:12,color:colors.muted,textAlign:'center'},
  photoOverlay:{position:'absolute',left:0,right:0,bottom:0,height:58,justifyContent:'flex-end',alignItems:'center',paddingBottom:9},
  photoChange:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:colors.ivory},
  photoRemove:{position:'absolute',top:7,right:7,width:27,height:27,borderRadius:14,backgroundColor:'rgba(12,3,8,.82)',borderWidth:1,borderColor:'rgba(255,255,255,.18)',alignItems:'center',justifyContent:'center'},
});

const vibeStyles=StyleSheet.create({
  hero:{padding:15,borderRadius:8,backgroundColor:'rgba(229,9,47,.08)',borderWidth:1,borderColor:'rgba(229,9,47,.24)',alignItems:'center',gap:9},
  progressDots:{flexDirection:'row',gap:7,marginTop:4},
  progressDot:{width:28,height:5,borderRadius:4,backgroundColor:colors.line},
  progressDotOn:{backgroundColor:colors.gold},
  iconBubble:{width:34,height:34,borderRadius:17,backgroundColor:'#FFFDFC',alignItems:'center',justifyContent:'center'},
  card:{height:86,padding:11,flexDirection:'row',alignItems:'center',justifyContent:'flex-start',gap:9},
  copy:{flex:1,minWidth:0},
  description:{fontFamily:'Poppins_400Regular',fontSize:8.7,lineHeight:12,color:'#A98E95',marginTop:2},
  descriptionOn:{fontFamily:'Poppins_600SemiBold',color:colors.gold},
  vibeMicro:{fontFamily:'Poppins_400Regular',fontSize:9.5,color:'#BFA3AA'},
  vibeCheck:{position:'absolute',right:7,top:7},
  tipCard:{padding:13,borderRadius:8,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.22)',flexDirection:'row',alignItems:'center',gap:10},
});

const alignmentStyles=StyleSheet.create({
  hero:{padding:15,borderRadius:8,backgroundColor:'rgba(229,9,47,.08)',borderWidth:1,borderColor:'rgba(229,9,47,.22)',alignItems:'center',gap:9},
  heroIcon:{width:52,height:52,borderRadius:26,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',shadowColor:colors.pink,shadowOpacity:.35,shadowRadius:14},
  answerCard:{gap:10},
  answerIcon:{width:38,height:38,borderRadius:19,backgroundColor:'#FFFDFC',alignItems:'center',justifyContent:'center'},
  answerIconOn:{backgroundColor:colors.pink},
  answerSub:{fontFamily:'Poppins_400Regular',fontSize:10.5,color:colors.muted,marginTop:3},
});

const homeStyles=StyleSheet.create({
  packageButton:{height:38,paddingHorizontal:11,borderRadius:20,backgroundColor:'rgba(212,175,55,.10)',borderWidth:1,borderColor:'rgba(212,175,55,.34)',flexDirection:'row',alignItems:'center',gap:6,marginLeft:'auto',marginRight:8},
  packageButtonText:{fontFamily:'Poppins_700Bold',fontSize:10,color:'#F3DFA7'},
  packageCard:{minHeight:78,borderRadius:22,overflow:'hidden',borderWidth:1,borderColor:'rgba(212,175,55,.28)',flexDirection:'row',alignItems:'center',gap:12,padding:13,backgroundColor:'#21100D'},
  packageIcon:{width:46,height:46,borderRadius:23,backgroundColor:'rgba(212,175,55,.12)',alignItems:'center',justifyContent:'center'},
});

const focusStyles=StyleSheet.create({
  header:{minHeight:70,paddingHorizontal:18,paddingTop:7,paddingBottom:10,flexDirection:'row',alignItems:'center',gap:10},
  content:{paddingHorizontal:18,paddingBottom:104,gap:16},
  journeyRail:{minHeight:70,paddingHorizontal:12,borderRadius:8,backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:'rgba(255,255,255,.075)',flexDirection:'row',alignItems:'center'},
  journeyStep:{width:48,alignItems:'center',justifyContent:'center',gap:4},
  journeyLabel:{fontFamily:'Poppins_700Bold',fontSize:8.5,color:'#DCC8CD'},
  journeyLine:{flex:1,height:1,backgroundColor:'rgba(212,175,55,.22)'},
  featuredRow:{gap:10},
  featuredRowWide:{flexDirection:'row',alignItems:'stretch'},
  featuredWide:{flex:1},
  executiveCard:{minHeight:154,padding:15,borderRadius:8,overflow:'hidden',borderWidth:1,borderColor:'rgba(212,175,55,.30)',backgroundColor:'#1C0908',flexDirection:'row',alignItems:'center',gap:12},
  featureIcon:{width:54,height:54,alignItems:'center',justifyContent:'center'},
  featureTitle:{fontFamily:'Poppins_700Bold',fontSize:17,lineHeight:22,color:colors.ivory,marginTop:2},
  featureBody:{fontFamily:'Poppins_400Regular',fontSize:10.5,lineHeight:15.5,color:'#CDB8BD',marginTop:3},
  likesCard:{minHeight:78,padding:13,borderRadius:8,backgroundColor:'rgba(255,255,255,.04)',borderWidth:1,borderColor:'rgba(255,255,255,.09)',flexDirection:'row',alignItems:'center',gap:10},
  likesWide:{maxWidth:310,minHeight:154},
  likesTitle:{fontFamily:'Poppins_700Bold',fontSize:13,color:colors.ivory},
  toolGrid:{gap:8},
  toolGridWide:{flexDirection:'row',flexWrap:'wrap'},
  tool:{minHeight:76,padding:12,borderRadius:8,backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'center',gap:10},
  toolWide:{width:'49%'},
  toolTitle:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.ivory},
  toolBody:{fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:colors.muted,marginTop:2},
  boundary:{minHeight:72,padding:12,borderRadius:8,backgroundColor:'rgba(212,175,55,.06)',borderWidth:1,borderColor:'rgba(212,175,55,.18)',flexDirection:'row',alignItems:'center',gap:10},
  boundaryTitle:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.ivory},
});

const homeCleanStyles=StyleSheet.create({
  header:{minHeight:70,paddingHorizontal:18,paddingTop:7,paddingBottom:10,flexDirection:'row',alignItems:'center',gap:9},
  headingCompact:{fontSize:20},
  brandLine:{fontFamily:'Poppins_700Bold',fontSize:9.5,letterSpacing:1.7,color:colors.ivory},
  brandOne:{color:colors.gold},
  headerSub:{fontFamily:'Poppins_400Regular',fontSize:11.5,lineHeight:17,color:'#CDB5BB',marginTop:3},
  headerButton:{width:40,height:40,borderRadius:20,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.09)',alignItems:'center',justifyContent:'center'},
  content:{paddingHorizontal:18,paddingBottom:124,gap:16},
  sideRail:{position:'absolute',right:12,top:132,zIndex:5,gap:9},
  sideButton:{width:58,minHeight:58,borderRadius:20,backgroundColor:'rgba(27,4,10,.88)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',alignItems:'center',justifyContent:'center',gap:4,shadowColor:'#FF2448',shadowOpacity:.2,shadowRadius:14},
  goldButton:{borderColor:'rgba(212,175,55,.35)',backgroundColor:'rgba(42,18,8,.9)'},
  sideText:{fontFamily:'Poppins_700Bold',fontSize:8.5,color:'#E9D8DC'},
  hero:{minHeight:92,borderRadius:22,overflow:'hidden',padding:13,flexDirection:'row',alignItems:'center',gap:13,borderWidth:1,borderColor:'rgba(255,255,255,.09)',backgroundColor:'#1B0308'},
  dailyCount:{width:72,minHeight:66,borderRadius:18,backgroundColor:'rgba(229,9,47,.13)',borderWidth:1,borderColor:'rgba(255,110,128,.20)',alignItems:'center',justifyContent:'center',padding:7},
  heroCopy:{flex:1,gap:8},
  heroTitle:{fontFamily:'Poppins_700Bold',fontSize:14,color:colors.ivory},
  heroTop:{flexDirection:'row',alignItems:'center',gap:13},
  roseSeal:{width:58,height:58,borderRadius:29,backgroundColor:'#A80022',borderWidth:1,borderColor:'rgba(255,255,255,.20)',alignItems:'center',justifyContent:'center',shadowColor:'#FF2448',shadowOpacity:.5,shadowRadius:18},
  roseEmoji:{fontFamily:'Poppins_700Bold',fontSize:25,color:colors.ivory},
  script:{fontFamily:'Satisfy_400Regular',fontSize:31,color:colors.ivory},
  heroBody:{fontFamily:'Poppins_400Regular',fontSize:12.2,lineHeight:18,color:'#D8BFC5',marginTop:1},
  chipWrap:{flexDirection:'row',flexWrap:'wrap',gap:6},
  cleanChip:{maxWidth:'100%',paddingHorizontal:9,paddingVertical:5,borderRadius:14,backgroundColor:'#FFFDFC',borderWidth:1,borderColor:'rgba(255,255,255,.09)'},
  cleanChipText:{fontFamily:'Poppins_600SemiBold',fontSize:9.2,color:'#F0D8DE'},
  statsRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:2},
  statBlock:{maxWidth:112},
  statNumber:{fontFamily:'Poppins_700Bold',fontSize:18,color:colors.ivory},
  statWord:{fontFamily:'Poppins_700Bold',fontSize:12,lineHeight:15,color:colors.ivory},
  statLabel:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:colors.muted,marginTop:1},
  statLine:{width:1,height:32,backgroundColor:'rgba(255,255,255,.12)'},
  crossedMini:{minHeight:54,borderRadius:20,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.20)',flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:13},
  crossedText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:11.5,lineHeight:16,color:'#F0D8BE'},
  featuredWrap:{gap:11},
  sectionRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  sectionHint:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:colors.muted},
  nudgeRow:{minHeight:62,paddingHorizontal:12,paddingVertical:9,borderRadius:18,backgroundColor:'rgba(212,175,55,.065)',borderWidth:1,borderColor:'rgba(212,175,55,.20)',flexDirection:'row',alignItems:'center',gap:9},
  nudgeTitle:{fontFamily:'Poppins_700Bold',fontSize:11.5,color:colors.ivory},
  nudgeBody:{fontFamily:'Poppins_400Regular',fontSize:9.5,color:colors.muted,marginTop:1},
  nudgeAction:{fontFamily:'Poppins_700Bold',fontSize:9.5,color:colors.gold},
  exploreSection:{gap:10},
  exploreGrid:{flexDirection:'row',gap:8},
  exploreAction:{flex:1,minHeight:50,paddingHorizontal:9,borderRadius:17,backgroundColor:'rgba(255,255,255,.04)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'center',gap:6},
  exploreActionCompact:{minHeight:62,paddingHorizontal:4,gap:2,flexDirection:'column',justifyContent:'center'},
  exploreTitle:{flex:1,fontFamily:'Poppins_700Bold',fontSize:10.5,color:colors.ivory},
  exploreTitleCompact:{fontSize:8.5,textAlign:'center',flex:0},
  matchGrid:{flexDirection:'row',flexWrap:'wrap',gap:14},
  matchGridItem:{width:'49%'},
  futureDeckNote:{minHeight:64,paddingHorizontal:13,paddingVertical:11,borderRadius:8,backgroundColor:'rgba(212,175,55,.055)',borderWidth:1,borderColor:'rgba(212,175,55,.18)',flexDirection:'row',alignItems:'center',gap:10},
  futureDeckTitle:{fontFamily:'Poppins_700Bold',fontSize:11.5,color:colors.ivory},
  futureDeckBody:{fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:colors.muted,marginTop:2},
  emptyCard:{gap:12,alignItems:'center'},
});

const marketplaceBrandStyles=StyleSheet.create({
  heroCompact:{paddingHorizontal:18,paddingVertical:16,gap:7,borderRadius:8},
  titleCompact:{fontSize:24,lineHeight:30,letterSpacing:0},
  bodyCompact:{fontSize:13,lineHeight:19},
  plannerToggle:{minHeight:68,paddingHorizontal:14,paddingVertical:11,borderRadius:8,backgroundColor:'rgba(212,175,55,.07)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:11},
  plannerTitle:{fontFamily:'Poppins_700Bold',fontSize:12.5,color:colors.ivory},
  plannerBody:{fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:colors.muted,marginTop:2},
  cityChooser:{minHeight:34,paddingHorizontal:10,borderRadius:8,borderWidth:1,borderColor:'rgba(212,175,55,.22)',backgroundColor:'rgba(212,175,55,.055)',flexDirection:'row',alignItems:'center',gap:7},
  cityChooserText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:'#F1D9A2'},
  dateMoment:{width:142,minHeight:122,padding:11,borderRadius:8,borderWidth:1,borderColor:'rgba(212,175,55,.20)',backgroundColor:'rgba(33,10,15,.95)',gap:6},
  dateMomentKind:{fontFamily:'Poppins_700Bold',fontSize:8.5,letterSpacing:.7,textTransform:'uppercase',color:colors.gold},
  dateMomentName:{fontFamily:'Poppins_700Bold',fontSize:11.2,lineHeight:15,color:colors.ivory},
  dateMomentMeta:{fontFamily:'Poppins_600SemiBold',fontSize:9,color:'#D7B9C1'},
});

const passportStyles=StyleSheet.create({
  card:{gap:13,padding:15,borderRadius:8,backgroundColor:'#160A0C',borderWidth:1,borderColor:'rgba(212,175,55,.24)'},
  cardCompact:{padding:13,gap:10},
  header:{flexDirection:'row',alignItems:'center',gap:10},
  summary:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.ivory,marginTop:2},
  edit:{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.20)'},
  fieldGrid:{flexDirection:'row',flexWrap:'wrap',gap:7},
  field:{flexGrow:1,flexBasis:'30%',minWidth:96,minHeight:54,paddingHorizontal:10,paddingVertical:8,borderRadius:8,backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:'rgba(255,255,255,.07)'},
  fieldLabel:{fontFamily:'Poppins_600SemiBold',fontSize:8.5,color:colors.muted},
  fieldValue:{fontFamily:'Poppins_700Bold',fontSize:10.2,lineHeight:14,color:'#F3E3E6',marginTop:3},
  fieldPrivate:{color:'#9A858A'},
  privacy:{fontFamily:'Poppins_400Regular',fontSize:9.2,lineHeight:13.5,color:'#A99298'},
  bridge:{gap:13,padding:16,borderRadius:8,backgroundColor:'#1B0D0A',borderWidth:1,borderColor:'rgba(212,175,55,.30)'},
  bridgeHeader:{flexDirection:'row',alignItems:'center',gap:10},
  bridgeTitle:{fontFamily:'Poppins_700Bold',fontSize:18,color:colors.ivory,marginTop:2},
  bridgeIntro:{fontFamily:'Poppins_400Regular',fontSize:11.5,lineHeight:17,color:'#D3BEC2'},
  alignedPill:{width:48,height:48,borderRadius:24,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(212,175,55,.11)',borderWidth:1,borderColor:'rgba(212,175,55,.30)'},
  alignedCount:{fontFamily:'Poppins_700Bold',fontSize:17,color:colors.gold},
  alignedLabel:{fontFamily:'Poppins_600SemiBold',fontSize:7.5,color:'#E6D09A'},
  bridgeList:{gap:7},
  bridgeRow:{minHeight:72,padding:10,borderRadius:8,backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:'rgba(255,255,255,.07)',flexDirection:'row',alignItems:'center',gap:9},
  bridgeLabel:{fontFamily:'Poppins_700Bold',fontSize:11.5,color:colors.ivory},
  bridgeValues:{fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:13.5,color:'#C7B0B5',marginTop:2},
  status:{fontFamily:'Poppins_700Bold',fontSize:7.5,letterSpacing:.7,color:colors.pinkSoft},
  statusAligned:{color:colors.gold},
  promptCard:{padding:12,borderRadius:8,backgroundColor:'rgba(229,9,47,.075)',borderWidth:1,borderColor:'rgba(229,9,47,.20)',flexDirection:'row',alignItems:'center',gap:10},
  promptLabel:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.pinkSoft},
  promptText:{fontFamily:'Poppins_600SemiBold',fontSize:11,lineHeight:16,color:colors.ivory,marginTop:2},
});

const growthLoopStyles=StyleSheet.create({
  nudgeCard:{minHeight:86,padding:14,borderRadius:24,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.28)',flexDirection:'row',alignItems:'center',gap:12,shadowColor:colors.gold,shadowOpacity:.12,shadowRadius:18},
  nudgeTitle:{fontFamily:'Poppins_700Bold',fontSize:14,color:colors.ivory},
  nudgeBody:{fontFamily:'Poppins_400Regular',fontSize:10.8,lineHeight:15.8,color:'#E3C9CE',marginTop:2},
  nudgeAction:{height:36,paddingHorizontal:12,borderRadius:18,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',shadowColor:colors.pink,shadowOpacity:.24,shadowRadius:10},
  nudgeActionText:{fontFamily:'Poppins_700Bold',fontSize:9.5,color:colors.ivory},
  metricGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  metricCard:{flexGrow:1,flexBasis:'31%',minWidth:112,minHeight:104,padding:12,borderRadius:20,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.085)',gap:6},
  metricTitle:{fontFamily:'Poppins_700Bold',fontSize:11.5,color:colors.ivory},
  metricBody:{fontFamily:'Poppins_400Regular',fontSize:9.3,lineHeight:13.3,color:'#CDB5BB'},
  commandCard:{gap:13,padding:15,borderRadius:28,backgroundColor:'rgba(58,6,15,.72)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',shadowColor:'#FF2448',shadowOpacity:.12,shadowRadius:20},
  networkCard:{gap:13,padding:15,borderRadius:28,backgroundColor:'rgba(24,5,9,.86)',borderWidth:1,borderColor:'rgba(212,175,55,.18)',shadowColor:colors.gold,shadowOpacity:.10,shadowRadius:20},
  commandHeader:{flexDirection:'row',alignItems:'center',gap:10},
  commandTitle:{fontFamily:'Poppins_700Bold',fontSize:19,lineHeight:24,color:colors.ivory,marginTop:3},
  networkSub:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,lineHeight:15,color:'#E3C8B4',marginTop:3},
  cityRail:{flexDirection:'row',flexWrap:'wrap',gap:8},
  cityLaunchChip:{flexGrow:1,flexBasis:'31%',minWidth:116,padding:10,borderRadius:18,backgroundColor:'rgba(255,255,255,.04)',borderWidth:1,borderColor:'rgba(255,255,255,.085)'},
  cityLaunchChipOn:{backgroundColor:'rgba(212,175,55,.11)',borderColor:'rgba(212,175,55,.35)'},
  cityLaunchName:{fontFamily:'Poppins_700Bold',fontSize:11.5,color:colors.ivory},
  cityLaunchMeta:{fontFamily:'Poppins_400Regular',fontSize:8.5,lineHeight:12,color:'#CDB5BB',marginTop:2},
  challengeCard:{padding:12,borderRadius:20,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:10},
  challengeTitle:{fontFamily:'Poppins_700Bold',fontSize:13,color:colors.ivory},
  challengeBody:{fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:'#DFC9A8',marginTop:2},
  challengeMeter:{width:54,height:54,borderRadius:27,backgroundColor:'rgba(229,9,47,.22)',borderWidth:1,borderColor:'rgba(255,255,255,.14)',alignItems:'center',justifyContent:'center'},
  challengeMeterText:{fontFamily:'Poppins_700Bold',fontSize:13,color:colors.ivory},
  challengeTrack:{height:6,borderRadius:4,backgroundColor:'rgba(255,255,255,.08)',overflow:'hidden',flexDirection:'row',gap:3},
  challengeStep:{flex:1,height:'100%',backgroundColor:'rgba(255,255,255,.10)'},
  challengeStepOn:{backgroundColor:colors.gold},
  networkLoop:{minHeight:76,padding:11,borderRadius:20,backgroundColor:'rgba(255,255,255,.04)',borderWidth:1,borderColor:'rgba(212,175,55,.12)',flexDirection:'row',alignItems:'center',gap:10},
  storyCard:{padding:12,borderRadius:19,backgroundColor:'rgba(229,9,47,.07)',borderWidth:1,borderColor:'rgba(229,9,47,.18)',flexDirection:'row',alignItems:'center',gap:9},
  promptCard:{padding:12,borderRadius:19,backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.09)',flexDirection:'row',alignItems:'center',gap:9},
  promptText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:11.2,lineHeight:16,color:'#F0D4DA'},
  retentionStats:{flexDirection:'row',gap:8},
  retentionStat:{flex:1,minHeight:58,borderRadius:18,backgroundColor:'rgba(12,1,4,.45)',borderWidth:1,borderColor:'rgba(212,175,55,.16)',alignItems:'center',justifyContent:'center',padding:7},
  retentionValue:{fontFamily:'Poppins_700Bold',fontSize:18,color:colors.gold},
  retentionLabel:{fontFamily:'Poppins_600SemiBold',fontSize:8.8,color:'#D8C1C6',marginTop:1,textAlign:'center'},
  retentionGrid:{gap:9},
  retentionCard:{minHeight:76,padding:11,borderRadius:20,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.09)',flexDirection:'row',alignItems:'center',gap:10},
  retentionCardOff:{opacity:.78,backgroundColor:'rgba(255,255,255,.025)'},
  retentionTitle:{fontFamily:'Poppins_700Bold',fontSize:11.7,color:colors.ivory},
  retentionBody:{fontFamily:'Poppins_400Regular',fontSize:9.4,lineHeight:13.6,color:'#CDB5BB',marginTop:2},
  retentionAction:{minWidth:66,height:32,paddingHorizontal:9,borderRadius:16,backgroundColor:'#FFFDFC',borderWidth:1,borderColor:'rgba(255,255,255,.10)',alignItems:'center',justifyContent:'center'},
  retentionActionOn:{backgroundColor:'rgba(212,175,55,.14)',borderColor:'rgba(212,175,55,.34)'},
  retentionActionText:{fontFamily:'Poppins_700Bold',fontSize:8.8,color:'#F4D8DE',textAlign:'center'},
  notificationCard:{padding:13,borderRadius:20,backgroundColor:'rgba(229,9,47,.075)',borderWidth:1,borderColor:'rgba(229,9,47,.20)',flexDirection:'row',alignItems:'center',gap:10},
  notificationTitle:{fontFamily:'Poppins_700Bold',fontSize:12.5,color:colors.ivory},
  notificationBody:{fontFamily:'Poppins_400Regular',fontSize:10.5,lineHeight:15,color:'#E1C6CE',marginTop:2},
});

const ventureStyles=StyleSheet.create({
  hero:{alignItems:'center',gap:10,padding:20,borderRadius:30,backgroundColor:'rgba(229,9,47,.09)',borderWidth:1,borderColor:'rgba(229,9,47,.26)',overflow:'hidden'},
  heroBadge:{width:64,height:64,borderRadius:32,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',shadowColor:colors.pink,shadowOpacity:.36,shadowRadius:18},
  metricGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  metricCard:{width:'48%',minHeight:118,borderRadius:22,padding:14,backgroundColor:'#1F070C',borderWidth:1,borderColor:'rgba(255,255,255,.08)',gap:8},
  metricIcon:{width:38,height:38,borderRadius:19,backgroundColor:'rgba(212,175,55,.12)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(212,175,55,.26)'},
  metricLabel:{fontFamily:'Poppins_700Bold',fontSize:9.5,letterSpacing:1.1,color:colors.pinkSoft,textTransform:'uppercase'},
  metricValue:{fontFamily:'Poppins_700Bold',fontSize:13.5,lineHeight:18,color:colors.ivory},
  actionGrid:{gap:10},
  section:{gap:12},
  priceSeal:{marginTop:6,paddingHorizontal:16,paddingVertical:10,borderRadius:22,backgroundColor:'rgba(212,175,55,.13)',borderWidth:1,borderColor:'rgba(212,175,55,.36)',alignItems:'center'},
  priceSealText:{fontFamily:'Poppins_700Bold',fontSize:15,color:colors.gold},
  priceSealSub:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:'#F1DDB0',marginTop:2},
  tabRow:{flexDirection:'row',flexWrap:'wrap',gap:8,padding:8,borderRadius:24,backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.11)',shadowColor:'#FF2448',shadowOpacity:.10,shadowRadius:14},
  tabButton:{height:40,paddingHorizontal:13,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.09)',shadowColor:'#000',shadowOpacity:.18,shadowRadius:8},
  tabButtonOn:{backgroundColor:'#A40B28',borderColor:'rgba(255,255,255,.18)',shadowColor:colors.pink,shadowOpacity:.25,shadowRadius:12},
  tabText:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.muted},
  statusCard:{padding:13,borderRadius:20,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'flex-start',gap:10},
  statusTitle:{fontFamily:'Poppins_700Bold',fontSize:12.5,color:colors.ivory,marginBottom:3},
  applicationCard:{gap:13,padding:15,borderRadius:24,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line},
  errorCard:{padding:10,borderRadius:16,backgroundColor:'rgba(228,107,114,.10)',borderWidth:1,borderColor:'rgba(228,107,114,.28)',flexDirection:'row',alignItems:'center',gap:8},
  errorText:{flex:1,fontFamily:'Poppins_700Bold',fontSize:10.5,lineHeight:15,color:'#FFD3D8'},
  executiveMatchCard:{height:430,borderRadius:28,overflow:'hidden',backgroundColor:colors.surface,borderWidth:1,borderColor:'rgba(212,175,55,.30)',shadowColor:colors.gold,shadowOpacity:.16,shadowRadius:20},
  executivePhoto:{width:'100%',height:'100%'},
  executiveMatchInfo:{position:'absolute',left:17,right:17,bottom:17,gap:8},
  executiveName:{fontFamily:'Poppins_700Bold',fontSize:24,lineHeight:30,letterSpacing:0,color:colors.ivory},
  conciergeCard:{gap:12,padding:18,borderRadius:28,backgroundColor:'#211014',borderWidth:1,borderColor:'rgba(212,175,55,.24)',alignItems:'center'},
  charCount:{alignSelf:'flex-end',fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:colors.muted,marginTop:-6},
  conciergeAvatar:{width:62,height:62,borderRadius:31,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center'},
  cityCard:{gap:11,padding:15,borderRadius:23,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line},
  priorityBadge:{width:46,height:46,borderRadius:23,backgroundColor:'#5A4310',borderWidth:1,borderColor:colors.gold,alignItems:'center',justifyContent:'center'},
  priorityText:{fontFamily:'Poppins_700Bold',fontSize:14,color:colors.ivory},
  progressTrack:{height:7,borderRadius:4,backgroundColor:'rgba(255,255,255,.07)',overflow:'hidden'},
  progressFill:{height:'100%',backgroundColor:colors.pink,borderRadius:4},
  nextStep:{flexDirection:'row',alignItems:'center',gap:8,padding:10,borderRadius:16,backgroundColor:'rgba(255,255,255,.045)'},
  nextText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:10.5,lineHeight:15,color:'#E6C7CC'},
  revenueRow:{padding:13,borderRadius:19,backgroundColor:'#22080D',borderWidth:1,borderColor:colors.line,flexDirection:'row',alignItems:'center',gap:12},
  stagePill:{width:62,minHeight:36,borderRadius:18,backgroundColor:'#64101F',alignItems:'center',justifyContent:'center',paddingHorizontal:8},
  stageText:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.ivory},
  revenueBody:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:11.5,lineHeight:17,color:'#F0D3D8'},
  checklistRow:{padding:13,borderRadius:18,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'flex-start',gap:10},
  checkTitle:{fontFamily:'Poppins_700Bold',fontSize:12.5,color:colors.ivory,marginBottom:3},
  trustMeter:{gap:12,padding:16,borderRadius:24,backgroundColor:'#211014',borderWidth:1,borderColor:colors.line},
  trustScore:{fontFamily:'Poppins_700Bold',fontSize:36,color:colors.ivory,marginTop:3},
  shieldLarge:{width:58,height:58,borderRadius:29,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center'},
  trustStep:{padding:14,borderRadius:20,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,flexDirection:'row',alignItems:'center',gap:12},
  stepIcon:{width:40,height:40,borderRadius:20,backgroundColor:'#35101A',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.line},
  stepIconDone:{backgroundColor:'#8F1028',borderColor:colors.pink},
  reviewCard:{gap:11,padding:15,borderRadius:23,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line},
  riskDot:{width:10,height:10,borderRadius:5,backgroundColor:'#69BB8A',marginRight:8},
  riskMedium:{backgroundColor:colors.gold},
  riskHigh:{backgroundColor:colors.danger},
  riskPill:{paddingHorizontal:9,paddingVertical:5,borderRadius:13,backgroundColor:'rgba(255,255,255,.07)',borderWidth:1,borderColor:'rgba(255,255,255,.10)'},
  riskText:{fontFamily:'Poppins_700Bold',fontSize:9.5,color:'#F4D8DE'},
});

const coachStyles=StyleSheet.create({
  header:{height:60,flexDirection:'row',alignItems:'center'},
  content:{gap:18,paddingBottom:38},
  hero:{alignItems:'center',gap:10,padding:18,borderRadius:28,backgroundColor:'rgba(229,9,47,.08)',borderWidth:1,borderColor:'rgba(229,9,47,.24)'},
  heroIcon:{width:62,height:62,borderRadius:31,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',shadowColor:colors.pink,shadowOpacity:.35,shadowRadius:16},
  homeGrid:{flexDirection:'row',gap:10},
  homeCard:{flex:1,minHeight:142,borderRadius:24,padding:14,backgroundColor:'rgba(37,8,14,.92)',borderWidth:1,borderColor:'rgba(255,255,255,.09)',gap:8},
  homeIcon:{width:40,height:40,borderRadius:20,backgroundColor:'#32250A',alignItems:'center',justifyContent:'center'},
  homeTitle:{fontFamily:'Poppins_700Bold',fontSize:12.5,color:colors.ivory},
  homeBody:{fontFamily:'Poppins_400Regular',fontSize:9.8,lineHeight:14,color:'#CDB5BB'},
  trustStrip:{gap:10},
  trustItem:{padding:13,borderRadius:18,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'center',gap:10},
  trustIcon:{width:36,height:36,borderRadius:18,backgroundColor:'#42101B',alignItems:'center',justifyContent:'center'},
  trustTitle:{fontFamily:'Poppins_700Bold',fontSize:11.5,color:colors.ivory},
  trustBody:{fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:colors.muted,marginTop:2},
  cardGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  toolCard:{width:'48%',minHeight:158,borderRadius:22,padding:14,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,gap:8},
  toolCardOn:{borderColor:colors.pink,backgroundColor:'#3A0914',shadowColor:colors.pink,shadowOpacity:.18,shadowRadius:14},
  toolIcon:{width:42,height:42,borderRadius:21,backgroundColor:'#4C1020',alignItems:'center',justifyContent:'center'},
  toolTitle:{fontFamily:'Poppins_700Bold',fontSize:12.5,color:colors.ivory},
  toolBody:{fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:colors.muted},
  outputCard:{gap:12,padding:16,borderRadius:22,backgroundColor:'#211014',borderWidth:1,borderColor:colors.line},
  outputText:{fontFamily:'Poppins_600SemiBold',fontSize:13,lineHeight:20,color:'#F3DEE2'},
  coachInput:{minHeight:54,borderRadius:17,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface2,color:colors.ivory,paddingHorizontal:13,fontFamily:'Poppins_400Regular',fontSize:12.5},
  coachActions:{flexDirection:'row',gap:10},
  savedNote:{padding:10,borderRadius:16,backgroundColor:'rgba(88,201,128,.10)',borderWidth:1,borderColor:'rgba(88,201,128,.28)',flexDirection:'row',alignItems:'center',gap:8},
  savedNoteText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:10.5,lineHeight:15,color:'#A7E6BA'},
  feedbackCard:{gap:10,padding:13,borderRadius:18,backgroundColor:'rgba(212,175,55,.06)',borderWidth:1,borderColor:'rgba(212,175,55,.20)'},
  feedbackChoices:{flexDirection:'row',flexWrap:'wrap',gap:8},
  feedbackChoice:{minHeight:42,paddingHorizontal:11,borderRadius:16,backgroundColor:'rgba(255,255,255,.05)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',flexDirection:'row',alignItems:'center',gap:6},
  feedbackChoiceText:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:colors.ivory},
  feedbackConsent:{minHeight:44,flexDirection:'row',alignItems:'center',gap:9},
  feedbackConsentText:{flex:1,fontFamily:'Poppins_400Regular',fontSize:10.5,lineHeight:15,color:'#D8C2C7'},
  feedbackSaved:{fontFamily:'Poppins_700Bold',fontSize:10.5,color:'#A7E6BA'},
  checkRow:{flexDirection:'row',alignItems:'center',gap:8,padding:10,borderRadius:15,backgroundColor:'rgba(255,255,255,.05)'},
  checkText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:11.5,color:colors.ivory},
  boundaryCard:{padding:15,borderRadius:20,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:12},
  searchPanel:{gap:11,padding:13,borderRadius:22,backgroundColor:'rgba(255,255,255,.04)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  filterPill:{height:40,paddingHorizontal:14,borderRadius:20,backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:.16,shadowRadius:8},
  filterPillOn:{backgroundColor:'#A40B28',borderColor:'rgba(255,255,255,.18)',shadowColor:colors.pink,shadowOpacity:.24,shadowRadius:12},
  filterText:{fontFamily:'Poppins_700Bold',fontSize:10.5,color:colors.muted},
  cityPill:{height:39,paddingHorizontal:13,borderRadius:20,backgroundColor:'rgba(255,255,255,.05)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',alignItems:'center',justifyContent:'center'},
  cityPillOn:{backgroundColor:'#8D1028',borderColor:'rgba(255,255,255,.18)',shadowColor:colors.pink,shadowOpacity:.22,shadowRadius:10},
  cityText:{fontFamily:'Poppins_600SemiBold',fontSize:10,color:colors.muted},
  resultCount:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.gold},
  eventStats:{flexDirection:'row',gap:8},
  eventStat:{flex:1,minHeight:76,borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,alignItems:'center',justifyContent:'center',padding:8},
  eventStatValue:{fontFamily:'Poppins_700Bold',fontSize:23,color:colors.ivory},
  eventStatLabel:{fontFamily:'Poppins_400Regular',fontSize:8.5,color:colors.muted,textAlign:'center',marginTop:2},
  marketReadinessCard:{gap:13,padding:15,borderRadius:24,backgroundColor:'rgba(212,175,55,.065)',borderWidth:1,borderColor:'rgba(212,175,55,.23)',shadowColor:colors.gold,shadowOpacity:.10,shadowRadius:15},
  marketPillarGrid:{gap:8},
  marketPillar:{padding:10,borderRadius:16,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'flex-start',gap:8},
  marketPillarOn:{backgroundColor:'rgba(212,175,55,.055)',borderColor:'rgba(212,175,55,.17)'},
  marketPillarTitle:{fontFamily:'Poppins_700Bold',fontSize:10.8,color:colors.ivory},
  marketPillarBody:{fontFamily:'Poppins_400Regular',fontSize:8.8,lineHeight:12.8,color:'#BFAAB0',marginTop:1},
  marketPillarNext:{fontFamily:'Poppins_700Bold',fontSize:8.2,lineHeight:12,color:colors.gold,marginTop:5},
  liveOpsCard:{gap:13,padding:15,borderRadius:25,backgroundColor:'rgba(37,8,14,.92)',borderWidth:1,borderColor:'rgba(212,175,55,.22)',shadowColor:colors.gold,shadowOpacity:.10,shadowRadius:16},
  liveOpsNext:{padding:11,borderRadius:18,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.22)',flexDirection:'row',alignItems:'center',gap:9},
  liveOpsNextText:{flex:1,fontFamily:'Poppins_700Bold',fontSize:9.4,lineHeight:13.5,color:'#F3DFA8'},
  opsCityGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  opsCityCard:{flexGrow:1,flexBasis:'47%',minHeight:70,padding:10,borderRadius:17,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.085)'},
  opsCityName:{fontFamily:'Poppins_700Bold',fontSize:10.2,color:colors.ivory,marginBottom:4},
  opsCityMeta:{fontFamily:'Poppins_400Regular',fontSize:8.2,lineHeight:12,color:'#CDB5BB'},
  launchRoadmap:{gap:12,padding:15,borderRadius:24,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.085)',shadowColor:'#000',shadowOpacity:.15,shadowRadius:10},
  launchCityCard:{width:205,minHeight:148,borderRadius:21,padding:12,backgroundColor:'#1D090E',borderWidth:1,borderColor:'rgba(255,255,255,.09)',gap:6},
  launchStage:{alignSelf:'flex-start',paddingHorizontal:8,paddingVertical:4,borderRadius:12,backgroundColor:'rgba(212,175,55,.09)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',fontFamily:'Poppins_700Bold',fontSize:7.8,color:colors.gold},
  launchCity:{fontFamily:'Poppins_700Bold',fontSize:13.2,color:colors.ivory},
  launchFocus:{fontFamily:'Poppins_400Regular',fontSize:9.2,lineHeight:13.2,color:'#CDB5BB',flex:1},
  launchEventPill:{alignSelf:'flex-start',paddingHorizontal:8,paddingVertical:5,borderRadius:13,backgroundColor:'rgba(229,9,47,.11)',borderWidth:1,borderColor:'rgba(229,9,47,.24)'},
  launchEventText:{fontFamily:'Poppins_700Bold',fontSize:8.2,color:colors.pinkSoft},
  marketFilterGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  marketToggle:{flexGrow:1,flexBasis:'47%',minHeight:46,borderRadius:18,backgroundColor:'rgba(255,255,255,.05)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10},
  marketToggleOn:{backgroundColor:'#8D1028',borderColor:'rgba(255,255,255,.18)',shadowColor:colors.pink,shadowOpacity:.20,shadowRadius:10},
  marketToggleText:{flex:1,fontFamily:'Poppins_700Bold',fontSize:10.2,lineHeight:14,color:colors.muted},
  eventCard:{padding:14,borderRadius:22,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,flexDirection:'row',gap:12},
  eventEmoji:{width:48,height:48,borderRadius:24,backgroundColor:'#3D0A15',alignItems:'center',justifyContent:'center'},
  eventEmojiText:{fontSize:26},
  eventType:{paddingHorizontal:8,paddingVertical:5,borderRadius:12,backgroundColor:'rgba(229,9,47,.13)',borderWidth:1,borderColor:'rgba(229,9,47,.30)'},
  eventTypeText:{fontFamily:'Poppins_700Bold',fontSize:8,color:'#FFD9DE'},
  eventMeta:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:colors.pinkSoft,marginTop:3,marginBottom:4},
  eventFooter:{flexDirection:'row',alignItems:'center',gap:8,marginTop:10},
  eventTag:{flex:1,flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:9,paddingVertical:6,borderRadius:14,backgroundColor:'rgba(212,175,55,.08)'},
  eventTagText:{fontFamily:'Poppins_600SemiBold',fontSize:8.5,color:'#F0DCA6'},
  rsvpButton:{height:38,paddingHorizontal:16,borderRadius:20,backgroundColor:'#A40B28',borderWidth:1,borderColor:'rgba(255,255,255,.16)',alignItems:'center',justifyContent:'center',shadowColor:colors.pink,shadowOpacity:.28,shadowRadius:12,shadowOffset:{width:0,height:6}},
  rsvpText:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.ivory},
  rsvpConfirm:{padding:14,borderRadius:22,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:12},
  detailsButton:{height:38,paddingHorizontal:14,borderRadius:20,backgroundColor:'rgba(255,255,255,.075)',borderWidth:1,borderColor:'rgba(255,255,255,.13)',alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:.20,shadowRadius:8},
  detailsText:{fontFamily:'Poppins_700Bold',fontSize:10,color:'#F5D6DA'},
  inlineLink:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.gold},
  packageCard:{padding:14,borderRadius:22,backgroundColor:'#1D090E',borderWidth:1,borderColor:'rgba(212,175,55,.18)',flexDirection:'row',gap:12,shadowColor:'#000',shadowOpacity:.16,shadowRadius:10},
  packageTier:{height:28,paddingHorizontal:9,borderRadius:14,backgroundColor:'rgba(212,175,55,.10)',borderWidth:1,borderColor:'rgba(212,175,55,.28)',alignItems:'center',justifyContent:'center'},
  packageTierText:{fontFamily:'Poppins_700Bold',fontSize:8.2,color:colors.gold},
  packageFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,marginTop:10},
  packagePrice:{fontFamily:'Poppins_700Bold',fontSize:13.5,color:colors.ivory},
  tonightPanel:{gap:12,padding:15,borderRadius:24,backgroundColor:'rgba(229,9,47,.055)',borderWidth:1,borderColor:'rgba(229,9,47,.20)',shadowColor:colors.pink,shadowOpacity:.08,shadowRadius:12},
  tonightGrid:{gap:9},
  tonightCard:{minHeight:68,padding:12,borderRadius:18,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'center',gap:10},
  tonightTitle:{fontFamily:'Poppins_700Bold',fontSize:11.8,color:colors.ivory},
  tonightBody:{fontFamily:'Poppins_400Regular',fontSize:9.2,lineHeight:13,color:colors.muted,marginTop:2},
  tonightPlan:{height:32,paddingHorizontal:11,borderRadius:16,backgroundColor:'rgba(212,175,55,.12)',borderWidth:1,borderColor:'rgba(212,175,55,.30)',alignItems:'center',justifyContent:'center'},
  tonightPlanText:{fontFamily:'Poppins_700Bold',fontSize:9,color:colors.gold},
  placeCard:{borderRadius:8,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,overflow:'hidden'},
  placeCardCompact:{backgroundColor:'#1D090E'},
  placeIcon:{width:50,height:50,borderRadius:25,backgroundColor:'#3D0A15',alignItems:'center',justifyContent:'center'},
  placeIconText:{fontSize:26},
  placeLabelRow:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:8},
  placeLabel:{paddingHorizontal:8,paddingVertical:5,borderRadius:13,backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  placeLabelText:{fontFamily:'Poppins_700Bold',fontSize:7.6,color:'#E9CDD4'},
  placeDetailHero:{padding:14,borderRadius:22,backgroundColor:'#2A0911',borderWidth:1,borderColor:colors.line,flexDirection:'row',alignItems:'center',gap:13},
  placeDetailEmoji:{fontSize:48},
  detailRows:{gap:9},
  detailRow:{padding:12,borderRadius:16,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,flexDirection:'row',alignItems:'center',gap:10},
  detailLabel:{fontFamily:'Poppins_400Regular',fontSize:9.5,color:colors.muted},
  detailValue:{fontFamily:'Poppins_600SemiBold',fontSize:11.5,color:colors.ivory,marginTop:2},
  chatCoach:{paddingHorizontal:14,paddingVertical:8,gap:7,backgroundColor:'#18080D',borderBottomWidth:1,borderBottomColor:colors.line},
  chatCoachTitle:{fontFamily:'Poppins_700Bold',fontSize:11,color:colors.ivory,marginLeft:7},
  suggestionChip:{paddingHorizontal:11,paddingVertical:7,borderRadius:16,backgroundColor:'rgba(229,9,47,.10)',borderWidth:1,borderColor:'rgba(229,9,47,.22)'},
  suggestionText:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:'#EFD4DA'},
  badgeCard:{gap:11,padding:15,borderRadius:22,backgroundColor:'#24100E',borderWidth:1,borderColor:'rgba(212,175,55,.22)'},
  badgeRow:{flexDirection:'row',flexWrap:'wrap',gap:8},
  badgePill:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:10,paddingVertical:7,borderRadius:16,backgroundColor:'#FFFDFC',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  badgeText:{fontFamily:'Poppins_600SemiBold',fontSize:10,color:'#F1D8DD'},
  opsCard:{gap:13,padding:15,borderRadius:24,backgroundColor:'rgba(212,175,55,.055)',borderWidth:1,borderColor:'rgba(212,175,55,.20)',shadowColor:colors.gold,shadowOpacity:.08,shadowRadius:12},
  opsGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},
  opsItem:{flexGrow:1,flexBasis:'47%',minHeight:128,borderRadius:19,padding:12,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',gap:7},
  opsTitle:{fontFamily:'Poppins_700Bold',fontSize:11.5,color:colors.ivory},
  opsBody:{fontFamily:'Poppins_400Regular',fontSize:8.8,lineHeight:13,color:'#CDB5BB'},
  checklistWrap:{gap:7,paddingTop:2},
  safeCheckItem:{flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:10,paddingVertical:8,borderRadius:16,backgroundColor:'rgba(0,0,0,.16)'},
  safeCheckText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:9.8,color:'#EFD9DE'},
  partnerCta:{padding:15,borderRadius:24,backgroundColor:'#1D090E',borderWidth:1,borderColor:'rgba(212,175,55,.22)',flexDirection:'row',alignItems:'center',gap:12,shadowColor:colors.gold,shadowOpacity:.08,shadowRadius:12},
  partnerStatus:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,lineHeight:14,color:colors.gold,marginTop:7},
  partnerIntakeHero:{padding:13,borderRadius:20,backgroundColor:'rgba(212,175,55,.075)',borderWidth:1,borderColor:'rgba(212,175,55,.23)',flexDirection:'row',alignItems:'center',gap:11},
  partnerPackageChip:{height:38,paddingHorizontal:12,borderRadius:19,backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',alignItems:'center',justifyContent:'center'},
  partnerPackageChipOn:{backgroundColor:'#8D1028',borderColor:'rgba(212,175,55,.35)'},
  partnerPackageText:{fontFamily:'Poppins_700Bold',fontSize:9.5,color:colors.muted},
});

const supportStyles=StyleSheet.create({
  header:{height:58,flexDirection:'row',alignItems:'center'},
  content:{gap:18,paddingBottom:34},
  hero:{padding:19,borderRadius:28,backgroundColor:'rgba(229,9,47,.08)',borderWidth:1,borderColor:'rgba(229,9,47,.24)',alignItems:'center',gap:9},
  liveStatus:{flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:10,paddingVertical:6,borderRadius:16,backgroundColor:'rgba(105,187,138,.08)',borderWidth:1,borderColor:'rgba(105,187,138,.24)'},
  liveDot:{width:9,height:9,borderRadius:5,backgroundColor:'#69BB8A',shadowColor:'#69BB8A',shadowOpacity:.7,shadowRadius:8},
  liveText:{fontFamily:'Poppins_700Bold',fontSize:9.5,color:'#BEECCF'},
  ticketCard:{padding:14,borderRadius:22,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:12},
  topicGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  topicCard:{width:'48%',minHeight:82,borderRadius:20,padding:13,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,gap:8},
  topicCardOn:{borderColor:colors.gold,backgroundColor:'#2A170A'},
  topicText:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.ivory},
  topicSla:{fontFamily:'Poppins_400Regular',fontSize:9.5,color:colors.muted},
  appealCaseInput:{height:52,borderRadius:16,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface2,color:colors.ivory,paddingHorizontal:13,fontFamily:'Poppins_400Regular',fontSize:12,marginTop:8},
  messageBox:{minHeight:115,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface2,color:colors.ivory,padding:13,fontFamily:'Poppins_400Regular',fontSize:13,textAlignVertical:'top',marginVertical:13},
  quickRow:{gap:10},
  quickGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  quickCard:{width:'48%',minHeight:125,borderRadius:22,padding:13,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.09)',gap:8},
  quickTitle:{fontFamily:'Poppins_700Bold',fontSize:12.5,color:colors.ivory},
  quickBody:{fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:colors.muted},
  infoHero:{padding:14,borderRadius:20,backgroundColor:'rgba(212,175,55,.07)',borderWidth:1,borderColor:'rgba(212,175,55,.22)',flexDirection:'row',alignItems:'center',gap:12},
  infoList:{gap:8},
  infoRow:{padding:11,borderRadius:16,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'center',gap:9},
  infoText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:11,lineHeight:16,color:'#EFD7DC'},
  faqCard:{padding:15,borderRadius:20,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,gap:5},
});

const styles=StyleSheet.create({
  matchCardCompact:{height:500},
  matchInfoCompact:{left:14,right:14,bottom:14,gap:7},
  matchNameCompact:{fontSize:23},
  matchMetaCompact:{fontSize:10.5},
  nopeCompact:{width:48,height:48,borderRadius:24},
  yesCompact:{height:48,borderRadius:24,gap:5},
  yesTextCompact:{fontSize:11.5},
  center:{flex:1,alignItems:'center',justifyContent:'center'},resetButton:{height:52,borderRadius:radius.md,borderWidth:1,borderColor:'rgba(228,107,114,.35)',backgroundColor:'rgba(228,107,114,.06)',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9},resetText:{fontFamily:'Poppins_600SemiBold',fontSize:13,color:colors.danger},seriousPromise:{padding:13,borderRadius:radius.md,backgroundColor:'rgba(229,9,47,.08)',borderWidth:1,borderColor:'rgba(229,9,47,.24)',flexDirection:'row',alignItems:'center',gap:10},seriousPromiseText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:11.5,lineHeight:17,color:'#E9C6E1'},alignmentProgress:{gap:8},alignmentTrack:{height:4,borderRadius:3,backgroundColor:colors.line,overflow:'hidden'},alignmentFill:{height:'100%',backgroundColor:colors.pink,borderRadius:3},alignmentCard:{borderRadius:radius.lg,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,padding:16,gap:16},alignmentRow:{flexDirection:'row',alignItems:'center',gap:12},alignmentRowIcon:{width:36,height:36,borderRadius:18,backgroundColor:'#3D1237',alignItems:'center',justifyContent:'center'},alignmentRowLabel:{fontFamily:'Poppins_400Regular',fontSize:10.5,color:colors.muted},alignmentRowValue:{fontFamily:'Poppins_600SemiBold',fontSize:13,color:colors.ivory,marginTop:2},alignmentPrivacy:{fontFamily:'Poppins_400Regular',fontSize:10.5,lineHeight:16,color:colors.muted},welcomeGlowOne:{position:'absolute',width:270,height:270,borderRadius:150,backgroundColor:'rgba(229,9,47,.17)',top:70,right:-100},welcomeGlowTwo:{position:'absolute',width:220,height:220,borderRadius:120,backgroundColor:'rgba(229,9,47,.10)',bottom:90,left:-120},memberPill:{marginLeft:'auto',flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:7,borderRadius:20,backgroundColor:'#FFFDFC',borderWidth:1,borderColor:colors.line},memberDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.pink,shadowColor:colors.pink,shadowOpacity:1,shadowRadius:6},memberText:{fontFamily:'Poppins_600SemiBold',fontSize:9,color:colors.muted},sparkOne:{position:'absolute',right:26,top:24,width:39,height:39,borderRadius:20,backgroundColor:'rgba(229,9,47,.12)',alignItems:'center',justifyContent:'center'},valueTag:{position:'absolute',left:4,bottom:38,flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:10,paddingVertical:7,borderRadius:20,backgroundColor:'rgba(30,6,10,.9)',borderWidth:1,borderColor:'rgba(229,9,47,.45)'},valueTagText:{fontFamily:'Poppins_600SemiBold',fontSize:9,color:colors.ivory},formGlow:{position:'absolute',width:250,height:250,borderRadius:130,backgroundColor:'rgba(229,9,47,.10)',top:-120,right:-100},backButton:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center',backgroundColor:'#FFFDFC',borderWidth:1,borderColor:colors.line},otpInput:{height:72,borderRadius:radius.md,borderWidth:1,borderColor:colors.purple,backgroundColor:colors.surface,color:colors.ivory,textAlign:'center',fontFamily:'Poppins_700Bold',fontSize:28,letterSpacing:12},formError:{fontFamily:'Poppins_400Regular',fontSize:12,color:colors.danger,textAlign:'center'},demoHint:{fontFamily:'Poppins_600SemiBold',fontSize:11.5,color:colors.pinkSoft,textAlign:'center'},resend:{alignSelf:'center',padding:10},resendText:{fontFamily:'Poppins_600SemiBold',fontSize:13,color:colors.purpleLight},glow:{position:'absolute',width:230,height:230,borderRadius:115,backgroundColor:'rgba(229,9,47,.15)'},tagline:{fontFamily:'Poppins_600SemiBold',fontStyle:'italic',fontSize:17,color:colors.muted,marginTop:14},fine:{position:'absolute',bottom:55,fontFamily:'Poppins_700Bold',fontSize:9,letterSpacing:2.4,color:'#7B5F75'},welcomeTop:{paddingTop:8,flexDirection:'row',alignItems:'center'},welcomeArt:{height:285,justifyContent:'center'},orbit:{position:'absolute',alignSelf:'center',width:245,height:245,borderRadius:130,borderWidth:1,borderColor:'rgba(255,138,152,.24)'},photoMini:{position:'absolute',width:142,height:190,borderRadius:70,overflow:'hidden',borderWidth:2,borderColor:'rgba(255,110,128,.65)',shadowColor:colors.pink,shadowOpacity:.22,shadowRadius:18},fill:{width:'100%',height:'100%'} as ImageStyle,heart:{position:'absolute',alignSelf:'center',width:54,height:54,borderRadius:27,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:colors.black,shadowColor:colors.pink,shadowOpacity:.7,shadowRadius:14},helper:{fontFamily:'Poppins_400Regular',fontSize:12.5,lineHeight:18,color:colors.muted},legal:{fontFamily:'Poppins_400Regular',fontSize:10.5,lineHeight:16,textAlign:'center',color:'#806D7D'},segment:{height:48,backgroundColor:'#F4EAE5',borderRadius:radius.pill,padding:4,flexDirection:'row',borderWidth:1,borderColor:colors.line},segmentItem:{flex:1,alignItems:'center',justifyContent:'center',borderRadius:radius.pill},segmentActive:{backgroundColor:'#6F1627'},segmentText:{fontFamily:'Poppins_600SemiBold',fontSize:13,color:colors.muted},selfie:{width:100,height:100,borderRadius:50,backgroundColor:'#370A15',borderWidth:1,borderColor:'#6F172B',alignItems:'center',justifyContent:'center'},cardTitle:{fontFamily:'Poppins_700Bold',fontSize:16,color:colors.ivory},upload:{flexDirection:'row',gap:13,alignItems:'center',padding:17,borderRadius:radius.md,borderWidth:1,borderColor:colors.line,backgroundColor:'#FFFDFC'},photoRow:{flexDirection:'row',gap:10},addPhoto:{flex:1,aspectRatio:.78,borderRadius:radius.md,borderWidth:1,borderColor:colors.line,borderStyle:'dashed',backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',overflow:'hidden'},photoNum:{position:'absolute',top:8,left:8,width:21,height:21,borderRadius:11,backgroundColor:'rgba(13,3,12,.8)',alignItems:'center',justifyContent:'center'},photoNumText:{fontFamily:'Poppins_600SemiBold',fontSize:10,color:colors.ivory},twoCol:{flexDirection:'row',gap:12},vibeGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},vibeCard:{width:'48%',height:92,borderWidth:1,borderColor:colors.line,borderRadius:radius.md,backgroundColor:'#FFFDFC',padding:13,justifyContent:'space-between'},vibeSelected:{borderColor:colors.pink,backgroundColor:'#F4E0E4'},vibeText:{fontFamily:'Poppins_600SemiBold',fontSize:13,color:colors.muted},intent:{padding:16,borderRadius:radius.md,borderWidth:1,borderColor:colors.line,backgroundColor:'#FFFDFC',flexDirection:'row',alignItems:'center',gap:13},intentSelected:{borderColor:colors.pink,backgroundColor:'#F4E0E4'},intentIcon:{width:45,height:45,borderRadius:23,backgroundColor:'#470D18',alignItems:'center',justifyContent:'center'},radio:{width:21,height:21,borderRadius:11,borderWidth:1,borderColor:colors.muted,alignItems:'center',justifyContent:'center'},radioOn:{borderColor:colors.pink},radioDot:{width:11,height:11,borderRadius:6,backgroundColor:colors.pink},homeHead:{paddingHorizontal:20,paddingTop:8,paddingBottom:12,flexDirection:'row',alignItems:'center'},kicker:{fontFamily:'Poppins_700Bold',fontSize:9.5,letterSpacing:1.7,color:colors.pinkSoft},avatar:{width:42,height:42,borderRadius:21,backgroundColor:'#6D1022',marginLeft:'auto',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.pink},avatarText:{fontFamily:'Poppins_700Bold',fontSize:20,color:colors.ivory},online:{position:'absolute',right:0,bottom:0,width:11,height:11,borderRadius:6,backgroundColor:'#69BB8A',borderWidth:2,borderColor:colors.black},curated:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:14,paddingVertical:11,borderRadius:radius.md,backgroundColor:'#F7E7E9',borderWidth:1,borderColor:'#6E2463'},curatedText:{fontFamily:'Poppins_600SemiBold',fontSize:11.5,color:'#793C4B',flex:1},curatedCount:{fontFamily:'Poppins_700Bold',color:colors.ivory,fontSize:12},matchCard:{height:590,borderRadius:30,overflow:'hidden',backgroundColor:colors.surface,borderWidth:1,borderColor:'#6F172B',shadowColor:colors.pink,shadowOpacity:.12,shadowRadius:20},matchPhoto:{width:'100%',height:'100%'},matchTop:{position:'absolute',top:17,left:17},matchInfo:{position:'absolute',left:19,right:19,bottom:18,gap:9},matchName:{fontFamily:'Poppins_700Bold',fontSize:29,color:'#FFFDFC',marginRight:7},matchMeta:{fontFamily:'Poppins_400Regular',fontSize:12.5,color:'#D4C1D0'},chipRow:{flexDirection:'row',flexWrap:'wrap',gap:7},cardActions:{flexDirection:'row',gap:10,marginTop:5},nope:{width:54,height:54,borderRadius:27,backgroundColor:'#FFFDFC',borderWidth:1,borderColor:colors.line,alignItems:'center',justifyContent:'center'},yes:{flex:1,height:54,borderRadius:27,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,shadowColor:colors.pink,shadowOpacity:.4,shadowRadius:10},yesText:{fontFamily:'Poppins_700Bold',fontSize:14,color:'#FFFDFC'},hero:{height:580},circleBtn:{margin:16,width:43,height:43,borderRadius:22,backgroundColor:'rgba(13,3,12,.72)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.line},detailBlockButton:{margin:16,width:43,height:43,borderRadius:22,backgroundColor:'rgba(70,4,13,.80)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,100,117,.35)'},heroText:{position:'absolute',left:21,right:21,bottom:27,gap:9},detailName:{fontFamily:'Poppins_700Bold',fontSize:36,color:colors.ivory},detailBody:{padding:22,gap:29},profileViewNotice:{padding:13,borderRadius:18,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:10},privateBlockCard:{padding:15,borderRadius:22,backgroundColor:'rgba(228,107,114,.08)',borderWidth:1,borderColor:'rgba(228,107,114,.25)',flexDirection:'row',alignItems:'center',gap:12},privateBlockIcon:{width:42,height:42,borderRadius:21,backgroundColor:'#64101F',alignItems:'center',justifyContent:'center'},privateBlockAction:{height:36,paddingHorizontal:13,borderRadius:18,backgroundColor:'rgba(255,100,117,.14)',borderWidth:1,borderColor:'rgba(255,100,117,.35)',alignItems:'center',justifyContent:'center'},privateBlockText:{fontFamily:'Poppins_700Bold',fontSize:10.5,color:colors.danger},voice:{padding:15,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,flexDirection:'row',alignItems:'center',gap:13},play:{width:42,height:42,borderRadius:21,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center'},wave:{height:27,flexDirection:'row',alignItems:'center',gap:3},sectionLabel:{fontFamily:'Poppins_700Bold',fontSize:10,letterSpacing:1.6,color:colors.pinkSoft},fixedAction:{position:'absolute',left:0,right:0,bottom:0,paddingHorizontal:20,paddingVertical:13,paddingBottom:24,backgroundColor:'#FFFDFC',borderTopWidth:1,borderTopColor:colors.line,flexDirection:'row',gap:11},matchFaces:{height:145,width:245},face:{position:'absolute',width:142,height:142,borderRadius:71,borderWidth:4,borderColor:'#590E20'},matchHeart:{position:'absolute',zIndex:3,left:98,top:48,width:49,height:49,borderRadius:25,backgroundColor:colors.pink,borderWidth:3,borderColor:'#2E0710',alignItems:'center',justifyContent:'center'},bigMatch:{fontFamily:'Satisfy_400Regular',fontSize:50,color:colors.ivory},miniFaces:{flexDirection:'row'},miniFace:{width:58,height:58,borderRadius:29,borderWidth:2,borderColor:colors.black},answer:{padding:18,borderRadius:radius.md,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center'},answerText:{fontFamily:'Poppins_600SemiBold',fontSize:14,color:colors.ivory,flex:1},private:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},chatHead:{height:65,paddingHorizontal:18,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderBottomColor:colors.line},chatAvatar:{width:42,height:42,borderRadius:21},onlineText:{fontFamily:'Poppins_400Regular',fontSize:11,color:colors.muted},safety:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,padding:9,backgroundColor:'#F6E4E7'},safetyText:{fontFamily:'Poppins_400Regular',fontSize:10.5,color:'#70404A'},messages:{flexGrow:1,padding:18,gap:14},iceReveal:{alignSelf:'center',alignItems:'center',gap:7,padding:14,borderRadius:radius.md,backgroundColor:colors.surface},revealText:{fontFamily:'Poppins_400Regular',fontSize:12,color:colors.muted},theirBubble:{alignSelf:'flex-start',maxWidth:'78%',padding:13,borderRadius:18,borderBottomLeftRadius:5,backgroundColor:colors.surface2},myBubble:{alignSelf:'flex-end',maxWidth:'78%',padding:13,borderRadius:18,borderBottomRightRadius:5,backgroundColor:'#F0D8DF'},bubbleText:{fontFamily:'Poppins_400Regular',fontSize:14,lineHeight:20,color:colors.ivory},time:{fontFamily:'Poppins_400Regular',fontSize:9,color:'#C5A6AB',marginTop:5,alignSelf:'flex-end'},composer:{paddingHorizontal:15,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:10,borderTopWidth:1,borderTopColor:colors.line},chatInput:{flex:1,height:44,borderRadius:22,backgroundColor:colors.surface,color:colors.ivory,paddingHorizontal:15,fontFamily:'Poppins_400Regular'},send:{width:40,height:40,borderRadius:20,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center'},nav:{position:'absolute',left:10,right:10,bottom:8,height:72,paddingTop:11,backgroundColor:'rgba(27,8,24,.96)',borderWidth:1,borderColor:'#531522',borderRadius:25,flexDirection:'row'},navItem:{flex:1,alignItems:'center',gap:4},navText:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:colors.muted},likesGrid:{flexDirection:'row',gap:12},likeCard:{flex:1,height:230,borderRadius:radius.lg,overflow:'hidden',justifyContent:'flex-end',padding:14},likeLock:{position:'absolute',alignSelf:'center',top:85,width:42,height:42,borderRadius:21,backgroundColor:'rgba(13,3,12,.75)',alignItems:'center',justifyContent:'center'},likeText:{fontFamily:'Poppins_600SemiBold',fontSize:12,color:colors.ivory},profileAvatar:{width:92,height:92,borderRadius:46,backgroundColor:'#6D1022',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:colors.pink},progress:{width:'100%',height:4,borderRadius:2,backgroundColor:colors.line,overflow:'hidden',marginTop:5},plusBanner:{padding:20,borderRadius:radius.lg,backgroundColor:'#370A15',borderWidth:1,borderColor:'#7E1B32',flexDirection:'row',alignItems:'center'},plusTitle:{fontFamily:'Poppins_600SemiBold',fontSize:19,color:colors.ivory,marginTop:7},setting:{height:58,paddingHorizontal:16,borderRadius:radius.md,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',gap:13},crown:{width:58,height:58,borderRadius:29,backgroundColor:'#400D18',borderWidth:1,borderColor:colors.pink,alignItems:'center',justifyContent:'center'},price:{fontFamily:'Poppins_700Bold',fontSize:29,color:colors.ivory,marginTop:6},per:{fontFamily:'Poppins_400Regular',fontSize:12,color:colors.muted},popular:{paddingHorizontal:10,paddingVertical:6,borderRadius:20,backgroundColor:colors.pink},popularText:{fontFamily:'Poppins_700Bold',fontSize:8,letterSpacing:1,color:colors.ivory}
});

const chatPremiumStyles=StyleSheet.create({
  safeArea:{flex:1,width:'100%',maxWidth:Platform.OS==='web'?820:undefined,alignSelf:'center',borderLeftWidth:Platform.OS==='web'?1:0,borderRightWidth:Platform.OS==='web'?1:0,borderColor:'rgba(255,255,255,.06)'},
  chatHead:{height:58,paddingHorizontal:13,gap:9},
  chatAvatar:{width:39,height:39,borderRadius:20},
  safety:{padding:6,gap:6,backgroundColor:'rgba(212,175,55,.055)',borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.06)'},
  messages:{padding:14,gap:10},
  theirBubble:{maxWidth:'74%',padding:12,borderRadius:18,borderBottomLeftRadius:6,backgroundColor:'rgba(255,255,255,.065)',borderWidth:1,borderColor:'rgba(255,255,255,.06)'},
  composer:{paddingHorizontal:12,paddingVertical:8,gap:8,borderTopColor:'rgba(255,255,255,.07)',backgroundColor:'rgba(12,2,5,.96)'},
  chatInput:{height:43,backgroundColor:'transparent',paddingHorizontal:14},
});

const swipeStyles=StyleSheet.create({
  cardLift:{shadowColor:'#FF2448',shadowOpacity:.26,shadowRadius:28,shadowOffset:{width:0,height:18},elevation:12},
  matchGlow:{position:'absolute',left:18,right:18,top:18,bottom:18,borderRadius:30,borderWidth:1,borderColor:'rgba(255,255,255,.08)',shadowColor:colors.pink,shadowOpacity:.2,shadowRadius:24},
  photoVignette:{position:'absolute',left:0,right:0,top:0,bottom:0,borderRadius:30,borderWidth:1,borderColor:'rgba(255,255,255,.10)'},
  premiumRibbon:{gap:8,alignItems:'flex-start'},
  matchSwipeHint:{marginTop:8,alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:9,paddingVertical:6,borderRadius:15,backgroundColor:'rgba(13,3,12,.66)',borderWidth:1,borderColor:'rgba(255,255,255,.12)'},
  matchSwipeHintText:{fontFamily:'Poppins_700Bold',fontSize:8.5,letterSpacing:.8,color:colors.pinkSoft},
  swipeOverlay:{position:'absolute',top:84,paddingHorizontal:16,paddingVertical:9,borderRadius:18,borderWidth:2,transform:[{rotate:'-10deg'}]},
  swipeYes:{left:24,borderColor:'#8EE0AA',backgroundColor:'rgba(40,130,75,.18)'},
  swipeNope:{right:24,borderColor:'#E46B72',backgroundColor:'rgba(228,107,114,.16)',transform:[{rotate:'10deg'}]},
  swipeLabel:{fontFamily:'Poppins_700Bold',fontSize:18,letterSpacing:1.4,color:colors.ivory},
  swipeRose:{position:'absolute',alignSelf:'center',top:66,alignItems:'center',gap:3,paddingHorizontal:18,paddingVertical:11,borderRadius:24,backgroundColor:'rgba(70,0,15,.75)',borderWidth:1,borderColor:colors.pink},
  swipeRoseEmoji:{fontSize:32},
  swipeRoseText:{fontFamily:'Poppins_700Bold',fontSize:10,letterSpacing:1.5,color:'#FFD7DC'},
  signalStrip:{flexDirection:'row',flexWrap:'wrap',gap:7},
  signalPill:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:9,paddingVertical:6,borderRadius:15,backgroundColor:'rgba(255,255,255,.08)',borderWidth:1,borderColor:'rgba(255,255,255,.12)'},
  signalText:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:'#F1D7DC'},
  profileSummary:{flexDirection:'row',alignItems:'stretch',borderRadius:18,backgroundColor:'rgba(12,2,6,.46)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',overflow:'hidden'},
  summaryItem:{flex:1,minHeight:55,paddingHorizontal:10,paddingVertical:8,justifyContent:'center'},
  summaryDivider:{width:1,backgroundColor:'rgba(255,255,255,.10)'},
  summaryLabel:{fontFamily:'Poppins_700Bold',fontSize:7.5,letterSpacing:1.1,color:colors.pinkSoft,textTransform:'uppercase'},
  summaryValue:{fontFamily:'Poppins_600SemiBold',fontSize:10.2,lineHeight:14,color:colors.ivory,marginTop:2},
  reasonCard:{flexDirection:'row',alignItems:'flex-start',gap:8,padding:10,borderRadius:18,backgroundColor:'rgba(212,175,55,.085)',borderWidth:1,borderColor:'rgba(212,175,55,.22)'},
  reasonTitle:{fontFamily:'Poppins_700Bold',fontSize:9.5,letterSpacing:.7,color:'#F7DFA8',textTransform:'uppercase'},
  reasonBody:{fontFamily:'Poppins_400Regular',fontSize:10.5,lineHeight:15,color:'#F2D6DC',marginTop:2},
  morePill:{height:28,minWidth:38,paddingHorizontal:10,borderRadius:14,backgroundColor:'rgba(255,255,255,.08)',borderWidth:1,borderColor:'rgba(255,255,255,.12)',alignItems:'center',justifyContent:'center'},
  morePillText:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.ivory},
  actionHint:{alignSelf:'flex-start',paddingHorizontal:10,paddingVertical:6,borderRadius:16,backgroundColor:'rgba(0,0,0,.24)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  actionHintText:{fontFamily:'Poppins_600SemiBold',fontSize:9,color:'#D9B9BF'},
});

const giftFlowStyles=StyleSheet.create({
  quoteCard:{gap:12,padding:14,borderRadius:22,backgroundColor:'rgba(36,8,13,.96)',borderWidth:1,borderColor:'rgba(212,175,55,.26)',shadowColor:colors.gold,shadowOpacity:.12,shadowRadius:14},
  quoteTitle:{fontFamily:'Poppins_700Bold',fontSize:14,color:colors.ivory},
  quoteMeta:{fontFamily:'Poppins_400Regular',fontSize:10.5,color:colors.muted,marginTop:2},
  flowPanel:{flexDirection:'row',gap:6,padding:10,borderRadius:20,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  flowStep:{flex:1,alignItems:'center',gap:4,position:'relative'},
  flowLine:{position:'absolute',right:-7,top:13,width:12,height:1,backgroundColor:'rgba(212,175,55,.22)'},
  flowTitle:{fontFamily:'Poppins_700Bold',fontSize:8.8,color:colors.ivory,textAlign:'center'},
  flowBody:{fontFamily:'Poppins_400Regular',fontSize:7.2,lineHeight:10,color:colors.muted,textAlign:'center'},
  totalPill:{paddingHorizontal:10,paddingVertical:7,borderRadius:16,backgroundColor:'rgba(212,175,55,.12)',borderWidth:1,borderColor:'rgba(212,175,55,.28)'},
  totalText:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.gold},
  priceRows:{gap:6,paddingVertical:4},
  priceRow:{flexDirection:'row',alignItems:'center'},
  priceLabel:{flex:1,fontFamily:'Poppins_400Regular',fontSize:10.5,color:colors.muted},
  priceValue:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:colors.ivory},
  quoteInfo:{gap:7,padding:10,borderRadius:17,backgroundColor:'rgba(212,175,55,.06)',borderWidth:1,borderColor:'rgba(212,175,55,.16)'},
  quoteInfoRow:{flexDirection:'row',alignItems:'flex-start',gap:8},
  quoteInfoText:{flex:1,fontFamily:'Poppins_400Regular',fontSize:9.2,lineHeight:13.5,color:'#E5CFD3'},
  readinessPanel:{gap:9,padding:11,borderRadius:18,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.09)'},
  readinessTitle:{marginLeft:7,fontFamily:'Poppins_700Bold',fontSize:11,color:colors.ivory},
  readinessBadge:{fontFamily:'Poppins_700Bold',fontSize:8.5,color:colors.gold},
  readinessRow:{flexDirection:'row',alignItems:'flex-start',gap:8,paddingTop:8,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.07)'},
  readinessItemTitle:{fontFamily:'Poppins_700Bold',fontSize:10,color:'#FFE6EA'},
  readinessBody:{fontFamily:'Poppins_400Regular',fontSize:8.5,lineHeight:12.4,color:colors.muted,marginTop:1},
  statusPreview:{padding:11,borderRadius:17,backgroundColor:'rgba(229,9,47,.08)',borderWidth:1,borderColor:'rgba(229,9,47,.22)',flexDirection:'row',alignItems:'flex-start',gap:9},
  statusWaiting:{backgroundColor:'rgba(212,175,55,.07)',borderColor:'rgba(212,175,55,.22)'},
  statusTitle:{fontFamily:'Poppins_700Bold',fontSize:10.5,color:colors.ivory},
  statusBody:{fontFamily:'Poppins_400Regular',fontSize:8.5,lineHeight:12.5,color:colors.muted,marginTop:1},
  statusCta:{fontFamily:'Poppins_700Bold',fontSize:8.5,color:colors.gold,alignSelf:'center'},
  noteInput:{minHeight:58,borderRadius:16,borderWidth:1,borderColor:'rgba(255,255,255,.10)',backgroundColor:'rgba(255,255,255,.045)',padding:11,color:colors.ivory,fontFamily:'Poppins_400Regular',fontSize:11.5,textAlignVertical:'top'},
  stepPreview:{flexDirection:'row',gap:6},
  stepMini:{flex:1,alignItems:'center',gap:5},
  stepDot:{width:27,height:27,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.10)'},
  stepDotOn:{backgroundColor:'rgba(212,175,55,.20)',borderColor:colors.gold},
  stepNumber:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.ivory},
  stepMiniText:{fontFamily:'Poppins_600SemiBold',fontSize:7.5,color:colors.muted,textAlign:'center'},
  quoteFine:{fontFamily:'Poppins_400Regular',fontSize:9,lineHeight:13,color:'#BFAAB4',textAlign:'center'},
  chatTrack:{width:'100%',gap:8,marginTop:11,paddingTop:10,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.12)'},
  chatTrackTitle:{fontFamily:'Poppins_700Bold',fontSize:10.5,color:colors.gold},
  trackLink:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.pinkSoft},
  chatTrackNotice:{padding:9,borderRadius:14,backgroundColor:'rgba(212,175,55,.09)',borderWidth:1,borderColor:'rgba(212,175,55,.22)',flexDirection:'row',alignItems:'flex-start',gap:7},
  chatTrackNoticeText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:8.8,lineHeight:12.8,color:'#EED8AC'},
  chatStep:{flexDirection:'row',gap:8,alignItems:'flex-start'},
  chatStepDot:{width:10,height:10,borderRadius:5,marginTop:4,backgroundColor:'rgba(255,255,255,.18)'},
  chatStepDone:{backgroundColor:'#76D99A'},
  chatStepActive:{backgroundColor:colors.gold,shadowColor:colors.gold,shadowOpacity:.45,shadowRadius:8},
  chatStepLabel:{fontFamily:'Poppins_700Bold',fontSize:9.2,color:'#D9C5CD'},
  chatStepBody:{fontFamily:'Poppins_400Regular',fontSize:8.3,lineHeight:12,color:colors.muted},
  chatTrackFine:{fontFamily:'Poppins_400Regular',fontSize:8.5,color:'#BFAAB4',marginTop:2},
});

const stickerStyles=StyleSheet.create({
  faceStickerFrame:{width:135,height:135,borderRadius:68,overflow:'hidden',borderWidth:4,borderColor:colors.pink,shadowColor:colors.pink,shadowOpacity:.35,shadowRadius:14},
});

const rosePopupStyles=StyleSheet.create({
  backdrop:{flex:1,alignItems:'center',justifyContent:'center',padding:22,backgroundColor:'rgba(0,0,0,.72)'},
  card:{width:'100%',maxWidth:420,minHeight:470,borderRadius:34,padding:24,alignItems:'center',justifyContent:'center',gap:14,borderWidth:1,borderColor:'rgba(255,255,255,.12)',overflow:'hidden',shadowColor:colors.pink,shadowOpacity:.45,shadowRadius:34},
  close:{position:'absolute',right:16,top:16,width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,.08)',alignItems:'center',justifyContent:'center',zIndex:2},
  petal:{position:'absolute',left:28,top:48,fontSize:31,color:'#FF7182',opacity:.55,transform:[{rotate:'-18deg'}]},
  petalRight:{left:undefined,right:28,top:58,transform:[{rotate:'18deg'}]},
  bloom:{width:118,height:118,borderRadius:59,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(229,9,47,.12)',borderWidth:1,borderColor:'rgba(255,255,255,.13)',shadowColor:colors.pink,shadowOpacity:.8,shadowRadius:30},
  rose:{fontSize:68},
  title:{fontFamily:'Poppins_700Bold',fontSize:24,color:colors.ivory,textAlign:'center'},
  note:{fontFamily:'Poppins_400Regular',fontSize:14,lineHeight:22,color:'#F7D5DC',textAlign:'center',paddingHorizontal:10},
  pushPreview:{width:'100%',padding:13,borderRadius:18,backgroundColor:'rgba(212,175,55,.09)',borderWidth:1,borderColor:'rgba(212,175,55,.28)',flexDirection:'row',alignItems:'center',gap:9},
  pushPreviewText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:10.5,lineHeight:15,color:'#E8D7AC'},
});

const referralStyles=StyleSheet.create({
  modalRoot:{flex:1,justifyContent:'flex-end',paddingHorizontal:Platform.OS==='web'?16:0},
  sheet:{maxHeight:'94%',paddingTop:0},
  sheetWide:{maxHeight:'90%',borderTopLeftRadius:8,borderTopRightRadius:8},
  scroll:{gap:11,padding:14,paddingBottom:20},
  close:{position:'absolute',right:22,top:22,zIndex:4,width:34,height:34,borderRadius:17,backgroundColor:'rgba(7,0,2,.76)',borderWidth:1,borderColor:'rgba(255,255,255,.14)',alignItems:'center',justifyContent:'center'},
  hero:{minHeight:188,borderRadius:8,padding:20,alignItems:'center',justifyContent:'center',gap:8,borderWidth:1,borderColor:'rgba(212,175,55,.30)',overflow:'hidden'},
  giftHalo:{width:70,height:70,borderRadius:35,backgroundColor:'rgba(212,175,55,.10)',alignItems:'center',justifyContent:'center'},
  title:{fontFamily:'Poppins_700Bold',fontSize:23,lineHeight:29,color:colors.ivory,textAlign:'center'},
  body:{fontFamily:'Poppins_400Regular',fontSize:11.5,lineHeight:17.5,color:'#D8C2C7',textAlign:'center',maxWidth:470},
  rewardCard:{gap:10,padding:13,borderRadius:8,backgroundColor:'#23090F',borderWidth:1,borderColor:'rgba(229,9,47,.30)'},
  rewardTop:{flexDirection:'row',alignItems:'center',gap:10},
  rewardEyebrow:{fontFamily:'Poppins_700Bold',fontSize:8.5,letterSpacing:1.1,color:colors.gold},
  rewardTitle:{fontFamily:'Poppins_700Bold',fontSize:13,color:colors.ivory,marginTop:1},
  rewardValue:{fontFamily:'Poppins_700Bold',fontSize:18,color:colors.gold},
  rewardPills:{flexDirection:'row',flexWrap:'wrap',gap:6},
  rewardPill:{paddingHorizontal:8,paddingVertical:5,borderRadius:7,backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.09)'},
  rewardPillText:{fontFamily:'Poppins_600SemiBold',fontSize:8,color:'#EBD7DC'},
  steps:{gap:8},
  stepsWide:{flexDirection:'row'},
  step:{minHeight:44,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:11,paddingVertical:8,borderRadius:8,backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:'rgba(255,255,255,.07)'},
  stepWide:{flex:1,minHeight:58,alignItems:'flex-start'},
  stepNumber:{width:25,height:25,borderRadius:13,backgroundColor:'#85162B',alignItems:'center',justifyContent:'center'},
  stepNumberText:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.ivory},
  stepText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:9.8,lineHeight:14.5,color:'#E4D1D5'},
  codeRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:12,borderRadius:8,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)'},
  codeLabel:{fontFamily:'Poppins_700Bold',fontSize:7.8,letterSpacing:1.1,color:'#C8AD63'},
  code:{fontFamily:'Poppins_700Bold',fontSize:15,color:colors.ivory,marginTop:2},
  status:{fontFamily:'Poppins_600SemiBold',fontSize:10,lineHeight:15,color:'#E8D28E',textAlign:'center'},
  actions:{gap:8},
  actionsWide:{flexDirection:'row'},
  action:{width:'100%'},
  actionWide:{flex:1,width:undefined},
  later:{alignSelf:'center',padding:8},
  laterText:{fontFamily:'Poppins_600SemiBold',fontSize:11,color:colors.muted},
  pricingBanner:{flexDirection:'row',alignItems:'center',gap:12,padding:15,borderRadius:22,backgroundColor:'rgba(212,175,55,.075)',borderWidth:1,borderColor:'rgba(212,175,55,.28)'},
  profileBanner:{minHeight:116,flexDirection:'row',alignItems:'center',gap:12,padding:16,borderRadius:24,borderWidth:1,borderColor:'rgba(212,175,55,.35)',backgroundColor:'#21090F',overflow:'hidden'},
});

const pricingStyles=StyleSheet.create({
  checkoutModalRoot:{flex:1},
  checkoutSheet:{maxHeight:'92%'},
  checkoutScroll:{gap:14,paddingBottom:8},
  hero:{alignItems:'center',gap:8,padding:18,borderRadius:30,backgroundColor:'rgba(229,9,47,.08)',borderWidth:1,borderColor:'rgba(229,9,47,.22)'},
  billingToggle:{height:52,borderRadius:26,padding:5,backgroundColor:'rgba(255,255,255,.05)',borderWidth:1,borderColor:'rgba(255,255,255,.09)',flexDirection:'row'},
  billingOption:{flex:1,borderRadius:22,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6},
  billingOptionOn:{backgroundColor:'#8F1028'},
  billingText:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.muted},
  saveBadge:{paddingHorizontal:7,paddingVertical:3,borderRadius:9,backgroundColor:'rgba(212,175,55,.18)',borderWidth:1,borderColor:'rgba(212,175,55,.32)'},
  saveText:{fontFamily:'Poppins_700Bold',fontSize:8,color:colors.gold},
  promiseGrid:{flexDirection:'row',gap:8},
  promiseCard:{flex:1,minHeight:98,borderRadius:18,padding:10,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',gap:5},
  promiseTitle:{fontFamily:'Poppins_700Bold',fontSize:10.5,color:colors.ivory},
  promiseBody:{fontFamily:'Poppins_400Regular',fontSize:8.5,lineHeight:12.5,color:colors.muted},
  entitlementPanel:{padding:14,borderRadius:22,backgroundColor:'rgba(212,175,55,.075)',borderWidth:1,borderColor:'rgba(212,175,55,.24)'},
  billingRailCard:{gap:12,padding:15,borderRadius:22,backgroundColor:'#18090E',borderWidth:1,borderColor:'rgba(255,255,255,.09)'},
  billingRailRow:{flexDirection:'row',alignItems:'flex-start',gap:10,paddingTop:10,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.06)'},
  entitlementRow:{flexDirection:'row',flexWrap:'wrap',gap:7},
  entitlementPill:{paddingHorizontal:9,paddingVertical:6,borderRadius:14,backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.10)'},
  entitlementText:{fontFamily:'Poppins_700Bold',fontSize:8.8,color:'#EED8AC'},
  planCard:{gap:16,padding:18,borderRadius:28,borderWidth:1,shadowColor:colors.pink,shadowOpacity:.14,shadowRadius:18},
  planIcon:{width:46,height:46,borderRadius:23,backgroundColor:'rgba(255,255,255,.05)',borderWidth:1,alignItems:'center',justifyContent:'center'},
  planFor:{fontFamily:'Poppins_400Regular',fontSize:11,lineHeight:16,color:'#D8BDC3',marginTop:3},
  priceRow:{flexDirection:'row',alignItems:'baseline',gap:7},
  annualNote:{fontFamily:'Poppins_700Bold',fontSize:9.5,color:colors.gold,marginLeft:4},
  featureRow:{flexDirection:'row',alignItems:'center'},
  executiveCard:{gap:16,padding:18,borderRadius:30,borderWidth:1,borderColor:'rgba(245,212,106,.45)',backgroundColor:'#23190A',overflow:'hidden',shadowColor:colors.gold,shadowOpacity:.18,shadowRadius:22},
  executiveIcon:{width:54,height:54,borderRadius:27,backgroundColor:'rgba(212,175,55,.12)',borderWidth:1,borderColor:'rgba(212,175,55,.38)',alignItems:'center',justifyContent:'center'},
  executiveTitle:{fontFamily:'Poppins_700Bold',fontSize:22,color:colors.ivory},
  sparkToggle:{minHeight:68,paddingHorizontal:14,paddingVertical:11,borderRadius:8,backgroundColor:'rgba(212,175,55,.07)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:11},
  sparkGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  sparkCard:{flexGrow:1,flexBasis:'31%',minWidth:92,minHeight:96,borderRadius:18,padding:11,backgroundColor:'rgba(255,255,255,.05)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',alignItems:'center',justifyContent:'center',gap:2},
  sparkCardBest:{borderColor:'rgba(212,175,55,.42)',backgroundColor:'rgba(212,175,55,.10)'},
  sparkCount:{fontFamily:'Poppins_700Bold',fontSize:22,color:colors.ivory},
  sparkLabel:{fontFamily:'Poppins_600SemiBold',fontSize:8.8,color:'#D7C0C7'},
  sparkPrice:{fontFamily:'Poppins_700Bold',fontSize:11,color:colors.gold,marginTop:2},
  sparkBest:{fontFamily:'Poppins_700Bold',fontSize:7.8,color:'#2A1205',backgroundColor:colors.gold,paddingHorizontal:7,paddingVertical:2,borderRadius:8,overflow:'hidden',marginTop:3},
  restoreCard:{padding:14,borderRadius:22,backgroundColor:'#1E0A0F',borderWidth:1,borderColor:'rgba(255,255,255,.09)',flexDirection:'row',alignItems:'center',gap:11},
  restoreButton:{height:38,paddingHorizontal:13,borderRadius:19,backgroundColor:'rgba(212,175,55,.12)',borderWidth:1,borderColor:'rgba(212,175,55,.32)',alignItems:'center',justifyContent:'center'},
  restoreText:{fontFamily:'Poppins_700Bold',fontSize:10,color:'#EED8AC'},
  manageCard:{gap:13,padding:15,borderRadius:22,backgroundColor:'#1B080E',borderWidth:1,borderColor:'rgba(229,9,47,.22)'},
  billingHelpBox:{gap:10,padding:12,borderRadius:17,backgroundColor:'rgba(255,255,255,.04)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  checkoutHero:{minHeight:96,borderRadius:24,padding:14,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:'rgba(255,255,255,.12)',overflow:'hidden'},
  checkoutTitle:{fontFamily:'Poppins_700Bold',fontSize:18,color:colors.ivory},
  checkoutSteps:{flexDirection:'row',gap:7},
  checkoutStep:{flex:1,alignItems:'center',gap:6},
  checkoutStepDot:{width:30,height:30,borderRadius:15,backgroundColor:'rgba(255,255,255,.07)',borderWidth:1,borderColor:'rgba(255,255,255,.12)',alignItems:'center',justifyContent:'center'},
  checkoutStepDotOn:{backgroundColor:'#5A4310',borderColor:'rgba(212,175,55,.45)'},
  checkoutStepNumber:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.ivory},
  checkoutStepText:{fontFamily:'Poppins_600SemiBold',fontSize:8.5,color:colors.muted,textAlign:'center'},
  checkoutStepTextOn:{color:'#EED8AC'},
  checkoutFeatureBox:{gap:9,padding:13,borderRadius:18,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  checkoutReady:{padding:13,borderRadius:18,backgroundColor:'rgba(88,201,128,.10)',borderWidth:1,borderColor:'rgba(88,201,128,.28)',flexDirection:'row',alignItems:'center',gap:9},
  checkoutReadyText:{flex:1,fontFamily:'Poppins_700Bold',fontSize:11.5,lineHeight:16,color:'#A7E6BA'},
  checkoutBlocked:{padding:13,borderRadius:18,backgroundColor:'rgba(229,9,47,.09)',borderWidth:1,borderColor:'rgba(229,9,47,.30)',flexDirection:'row',alignItems:'center',gap:9},
  checkoutBlockedText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:11,lineHeight:16,color:'#FFD5DB'},
});

const callStyles=StyleSheet.create({
  backdrop:{flex:1},
  content:{flex:1,alignItems:'center',justifyContent:'center',padding:24,gap:18},
  topPill:{flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:12,paddingVertical:8,borderRadius:18,backgroundColor:'#FFFDFC',borderWidth:1,borderColor:colors.line},
  topPillText:{fontFamily:'Poppins_700Bold',fontSize:10,letterSpacing:.8,color:'#E8D7AC'},
  avatarWrap:{width:155,height:155,borderRadius:78,alignItems:'center',justifyContent:'center'},
  callAvatar:{width:138,height:138,borderRadius:69,borderWidth:4,borderColor:colors.pink},
  callPulse:{position:'absolute',width:155,height:155,borderRadius:78,borderWidth:1,borderColor:'rgba(229,9,47,.45)'},
  callName:{fontFamily:'Poppins_700Bold',fontSize:24,lineHeight:30,letterSpacing:0,color:colors.ivory},
  callStatus:{fontFamily:'Poppins_400Regular',fontSize:13,color:colors.muted},
  videoPreview:{width:'100%',minHeight:120,borderRadius:24,borderWidth:1,borderColor:colors.line,backgroundColor:'rgba(255,255,255,.04)',alignItems:'center',justifyContent:'center',gap:8,padding:16},
  videoRemote:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},
  selfPreview:{position:'absolute',right:12,bottom:12,width:82,height:104,borderRadius:18,backgroundColor:'rgba(255,255,255,.10)',borderWidth:1,borderColor:'rgba(255,255,255,.18)',alignItems:'center',justifyContent:'center',gap:5,overflow:'hidden'},
  selfPreviewText:{fontFamily:'Poppins_700Bold',fontSize:9,color:colors.ivory},
  callStatePill:{position:'absolute',left:12,top:12,paddingHorizontal:9,paddingVertical:6,borderRadius:14,backgroundColor:'rgba(9,0,3,.68)',flexDirection:'row',alignItems:'center',gap:5},
  callStateText:{fontFamily:'Poppins_700Bold',fontSize:9,color:colors.ivory},
  callActions:{flexDirection:'row',gap:18,marginTop:8},
  callAction:{alignItems:'center',gap:8},
  callActionFrame:{width:62,height:62,borderRadius:31,alignItems:'center',justifyContent:'center',backgroundColor:'#FFFDFC',borderWidth:1,borderColor:'rgba(255,255,255,.10)'},
  callActionFrameOn:{backgroundColor:'rgba(212,175,55,.10)',borderColor:'rgba(212,175,55,.32)'},
  callActionFrameDanger:{backgroundColor:'rgba(228,107,114,.12)',borderColor:'rgba(228,107,114,.34)'},
  callActionIcon:{width:58,height:58,borderRadius:29,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.09)',borderWidth:1,borderColor:colors.line},
  callEnd:{backgroundColor:colors.danger,borderColor:colors.danger},
  callActionText:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:colors.muted},
  callFine:{fontFamily:'Poppins_400Regular',fontSize:10.5,lineHeight:16,color:colors.muted,textAlign:'center',maxWidth:310},
});

const aiStyles=StyleSheet.create({
  aiCard:{gap:14,padding:16,borderRadius:22,backgroundColor:'#25070D',borderWidth:1,borderColor:'#7A1B31'},
  aiSpark:{width:42,height:42,borderRadius:21,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center'},
  aiPills:{flexDirection:'row',flexWrap:'wrap',gap:7},
  aiPill:{paddingHorizontal:10,paddingVertical:6,borderRadius:14,backgroundColor:'rgba(229,9,47,.14)',borderWidth:1,borderColor:'rgba(229,9,47,.3)'},
  aiPillText:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:'#FFD7DC'},
  reasonRow:{flexDirection:'row',flexWrap:'wrap',gap:6},
  reasonPill:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:8,paddingVertical:5,borderRadius:13,backgroundColor:'rgba(212,175,55,.11)',borderWidth:1,borderColor:'rgba(212,175,55,.25)'},
  reasonText:{fontFamily:'Poppins_600SemiBold',fontSize:8.5,color:'#F6DFA3'},
  roseWallet:{minHeight:76,padding:13,borderRadius:22,backgroundColor:'#330812',borderWidth:1,borderColor:'#8B1B34',flexDirection:'row',alignItems:'center',gap:12},
  roseIcon:{width:46,height:46,borderRadius:23,backgroundColor:'#680B1C',alignItems:'center',justifyContent:'center',shadowColor:colors.pink,shadowOpacity:.35,shadowRadius:12},
  roseEmoji:{fontSize:27},
  roseTitle:{fontFamily:'Poppins_700Bold',fontSize:13,color:colors.ivory},
  roseBody:{fontFamily:'Poppins_400Regular',fontSize:10.5,lineHeight:15,color:'#E0B5BC',marginTop:2},
  rosePack:{height:34,paddingHorizontal:12,borderRadius:17,backgroundColor:'#5A4310',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.gold},
  rosePackText:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.ivory},
  roseAction:{width:78,height:56,borderRadius:28,backgroundColor:'rgba(62,36,8,.92)',borderWidth:1,borderColor:'rgba(212,175,55,.55)',alignItems:'center',justifyContent:'center',shadowColor:colors.gold,shadowOpacity:.26,shadowRadius:12},
  roseActionCompact:{width:66,height:48,borderRadius:24},
  roseActionEmoji:{fontSize:19},
  roseActionText:{fontFamily:'Poppins_700Bold',fontSize:9,color:'#F8E8B5',marginTop:1},
  fixedRose:{width:54,height:54,borderRadius:27,backgroundColor:'rgba(62,36,8,.92)',borderWidth:1,borderColor:'rgba(212,175,55,.55)',alignItems:'center',justifyContent:'center',shadowColor:colors.gold,shadowOpacity:.25,shadowRadius:12},
  detailAi:{gap:11,padding:16,borderRadius:22,backgroundColor:'#28100D',borderWidth:1,borderColor:'rgba(212,175,55,.26)'},
  filterCard:{gap:14,padding:16,borderRadius:22,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line},
  filterSection:{gap:8},
  filterWrap:{flexDirection:'row',flexWrap:'wrap',gap:7},
  filterChip:{minHeight:38,paddingHorizontal:12,paddingVertical:8,borderRadius:20,backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',flexDirection:'row',alignItems:'center',gap:5,shadowColor:'#000',shadowOpacity:.14,shadowRadius:7},
  filterChipOn:{backgroundColor:'#A40B28',borderColor:'rgba(255,255,255,.18)',shadowColor:colors.pink,shadowOpacity:.22,shadowRadius:10},
  filterChipText:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:colors.muted},
  privacyPolicyCard:{padding:15,borderRadius:20,backgroundColor:'#281F0B',borderWidth:1,borderColor:'rgba(212,175,55,.28)',flexDirection:'row',alignItems:'center',gap:12},
  chatRose:{width:40,height:40,borderRadius:20,backgroundColor:'rgba(62,36,8,.92)',borderWidth:1,borderColor:'rgba(212,175,55,.55)',alignItems:'center',justifyContent:'center',shadowColor:colors.gold,shadowOpacity:.24,shadowRadius:10},
  chatRoseEmoji:{fontSize:19},
  freeDot:{position:'absolute',right:-1,top:-1,width:9,height:9,borderRadius:5,backgroundColor:colors.gold,borderWidth:1,borderColor:colors.black},
  roseComposerHero:{borderRadius:24,padding:18,alignItems:'center',gap:7,borderWidth:1,borderColor:'rgba(255,255,255,.1)'},
  roseComposerEmoji:{fontSize:52},
  roseComposerTitle:{fontFamily:'Poppins_700Bold',fontSize:18,color:colors.ivory},
  roseComposerBody:{fontFamily:'Poppins_400Regular',fontSize:11.5,lineHeight:17,color:'#EBC1C8',textAlign:'center'},
  roseNote:{minHeight:92,borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,color:colors.ivory,padding:14,fontFamily:'Poppins_400Regular',fontSize:13,textAlignVertical:'top'},
});

const launchStyles=StyleSheet.create({
  script:{fontFamily:'Satisfy_400Regular',fontStyle:'normal',fontSize:24,color:'#F5D3EA'},
  petal:{position:'absolute',fontSize:24,color:'#FF7D91',opacity:.72,textShadowColor:'rgba(229,9,47,.65)',textShadowRadius:12},
  velvetGlowTop:{position:'absolute',top:-170,width:420,height:420,borderRadius:210,backgroundColor:'rgba(229,9,47,.10)'},
  velvetGlowBottom:{position:'absolute',bottom:-210,width:430,height:430,borderRadius:215,backgroundColor:'rgba(120,0,24,.16)'},
  logoFrame:{width:230,height:230,alignItems:'center',justifyContent:'center'},
  logoRing:{width:220,height:220,borderRadius:36,padding:1.5,shadowColor:colors.pink,shadowOpacity:.38,shadowRadius:26,shadowOffset:{width:0,height:12}},
  logoWell:{flex:1,borderRadius:34,overflow:'hidden',backgroundColor:'#0D0002',borderWidth:1,borderColor:'rgba(255,255,255,.08)',alignItems:'center',justifyContent:'center'},
  preloadLogo:{width:'100%',height:'100%'},
  orbitHeart:{position:'absolute',left:0,top:30,width:34,height:34,borderRadius:17,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#FF7788',shadowColor:colors.pink,shadowOpacity:.8,shadowRadius:12},
  orbitSpark:{position:'absolute',right:2,bottom:24,width:37,height:37,borderRadius:19,backgroundColor:'#321F06',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#7A5D18'},
  preloadBrand:{fontFamily:'Poppins_700Bold',fontSize:30,letterSpacing:.4,color:colors.ivory,marginTop:22,textShadowColor:'rgba(229,9,47,.32)',textShadowRadius:12},
  preloadBrandOne:{color:colors.gold},
  preloadLine:{fontFamily:'Poppins_700Bold',fontSize:13.5,lineHeight:19,color:'#FFE2E7',marginTop:9,textAlign:'center',letterSpacing:.2},
  preloadMood:{fontFamily:'Poppins_400Regular',fontSize:12.5,color:'#CDAFB6',marginTop:7},
  preloadPromise:{flexDirection:'row',alignItems:'center',gap:8,marginTop:22,paddingHorizontal:13,paddingVertical:8,borderRadius:20,backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:'rgba(255,255,255,.07)'},
  promiseDot:{width:4,height:4,borderRadius:2,backgroundColor:colors.gold},
  preloadPromiseText:{fontFamily:'Poppins_600SemiBold',fontSize:8,letterSpacing:1.25,color:'#DCC4C7'},
  preloadHalo:{position:'absolute',width:280,height:280,borderRadius:140,backgroundColor:'rgba(229,9,47,.14)',shadowColor:colors.pink,shadowOpacity:.85,shadowRadius:54},
  cleanHalo:{position:'absolute',width:250,height:250,borderRadius:125,backgroundColor:'rgba(229,9,47,.10)',shadowColor:colors.pink,shadowOpacity:.48,shadowRadius:44},
  preloadTrack:{position:'absolute',bottom:105,width:172,height:3,borderRadius:2,overflow:'hidden',backgroundColor:'rgba(255,255,255,.09)'},
  preloadFill:{width:'100%',height:'100%',borderRadius:2,backgroundColor:colors.gold,transformOrigin:'left'},
  trustRibbon:{flexDirection:'row',gap:7},
  trustPoint:{flex:1,minHeight:35,borderRadius:18,backgroundColor:'rgba(255,255,255,.05)',borderWidth:1,borderColor:colors.line,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},
  trustLabel:{fontFamily:'Poppins_600SemiBold',fontSize:9,color:'#EBD9E7'},
  checkoutCard:{gap:13,padding:17,borderRadius:23,backgroundColor:'#19141B',borderWidth:1,borderColor:'#705A22'},
  checkoutIcon:{width:43,height:43,borderRadius:22,backgroundColor:'#5A4310',alignItems:'center',justifyContent:'center',marginRight:11},
  applePayButton:{width:'100%',height:52},
  reservedPill:{minHeight:45,borderRadius:22,backgroundColor:'rgba(67,148,95,.15)',borderWidth:1,borderColor:'rgba(121,214,155,.4)',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,paddingHorizontal:11,paddingVertical:9},
  reservedText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:11,lineHeight:15,color:'#A7E6BA'},
  paymentFine:{fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:colors.muted,textAlign:'center'},
  scriptHero:{fontFamily:'Satisfy_400Regular',fontSize:24,color:colors.pinkSoft,textAlign:'center'},
  secureRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
  secureText:{fontFamily:'Poppins_400Regular',fontSize:9.5,color:'#D2C2A1'},
  billingPromise:{padding:16,borderRadius:22,backgroundColor:'#291025',borderWidth:1,borderColor:'#6F275F',flexDirection:'row',alignItems:'center',gap:12},
  promiseIcon:{width:44,height:44,borderRadius:22,backgroundColor:'#7C1A69',alignItems:'center',justifyContent:'center'},
});

const mediaStyles=StyleSheet.create({
  selfieImage:{width:'100%',height:'100%',borderRadius:50},
  profilePhoto:{width:'100%',height:'100%',borderRadius:46},
  mediaBadges:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:7},
  selfieCheck:{position:'absolute',right:-2,bottom:2,width:27,height:27,borderRadius:14,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:colors.surface},
  addPhotoText:{fontFamily:'Poppins_600SemiBold',fontSize:10,color:colors.muted,marginTop:4},
  photoChoiceHero:{padding:14,borderRadius:20,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:12},
  photoChoiceGrid:{flexDirection:'row',gap:10},
  photoChoice:{flex:1,minHeight:138,borderRadius:22,padding:13,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.09)',alignItems:'center',justifyContent:'center',gap:7},
  photoChoiceTitle:{fontFamily:'Poppins_700Bold',fontSize:13,color:colors.ivory},
  photoChoiceBody:{fontFamily:'Poppins_400Regular',fontSize:9.5,color:colors.muted,textAlign:'center'},
  voiceRecorder:{gap:14,padding:15,borderRadius:8,backgroundColor:'rgba(35,8,14,.92)',borderWidth:1,borderColor:'rgba(212,175,55,.18)'},
  voiceRecordIcon:{width:43,height:43,borderRadius:22,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',marginRight:12},
  voiceActions:{flexDirection:'row',gap:10},
  mediaAction:{flex:1,height:44,borderRadius:22,backgroundColor:'#5F1556',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},
  mediaActionText:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.ivory},
  deleteAction:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(228,107,114,.35)'},
});

const journeyStyles=StyleSheet.create({
  sheet:{maxHeight:'92%'},
  content:{gap:14,paddingBottom:10},
  progressCard:{padding:15,borderRadius:20,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',gap:10},
  progressTitle:{fontFamily:'Poppins_700Bold',fontSize:18,color:colors.ivory,marginTop:3},
  progressPercent:{fontFamily:'Poppins_700Bold',fontSize:21,color:colors.gold},
  track:{height:5,borderRadius:3,overflow:'hidden',backgroundColor:'rgba(255,255,255,.08)'},
  fill:{height:'100%',borderRadius:3,backgroundColor:colors.gold},
  stageList:{gap:8},
  stage:{minHeight:70,padding:11,borderRadius:17,backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:'rgba(255,255,255,.07)',flexDirection:'row',alignItems:'center',gap:10},
  stageCurrent:{backgroundColor:'rgba(229,9,47,.09)',borderColor:'rgba(255,90,115,.30)'},
  stageIcon:{width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.07)'},
  stageIconDone:{backgroundColor:'#7D641D'},
  stageTitle:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.ivory},
  stageBody:{fontFamily:'Poppins_400Regular',fontSize:10.5,lineHeight:15,color:colors.muted,marginTop:2},
  stageStatus:{fontFamily:'Poppins_700Bold',fontSize:8,letterSpacing:1,color:colors.gold},
  actionCard:{padding:14,borderRadius:18,backgroundColor:'rgba(229,9,47,.07)',borderWidth:1,borderColor:'rgba(229,9,47,.22)',flexDirection:'row',alignItems:'center',gap:11},
  responseCard:{padding:14,borderRadius:18,backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:'rgba(255,255,255,.09)',gap:11},
  responseActions:{gap:8},
  acceptedRow:{flexDirection:'row',alignItems:'center',gap:10},
  reflectionBlock:{gap:9},
  reflectionOption:{minHeight:62,padding:11,borderRadius:17,backgroundColor:'rgba(255,255,255,.04)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'center',gap:10},
  reflectionTitle:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.ivory},
  reflectionBody:{fontFamily:'Poppins_400Regular',fontSize:10.5,lineHeight:15,color:colors.muted,marginTop:2},
  savedReflection:{padding:13,borderRadius:18,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.22)',flexDirection:'row',alignItems:'center',gap:10},
  consentRow:{minHeight:76,padding:12,borderRadius:18,backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:'rgba(255,255,255,.09)',flexDirection:'row',alignItems:'center',gap:10},
  consentRowOn:{backgroundColor:'rgba(212,175,55,.07)',borderColor:'rgba(212,175,55,.25)'},
});

const chatStyles=StyleSheet.create({
  onlineRow:{flexDirection:'row',alignItems:'center',gap:5,marginTop:2},
  onlineDot:{width:6,height:6,borderRadius:3,backgroundColor:'#58C980'},
  initialAvatar:{backgroundColor:'#5D1022',borderWidth:1,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  initialAvatarText:{fontFamily:'Poppins_700Bold',fontSize:18,color:colors.ivory},
  headerAction:{width:33,height:33,borderRadius:17,backgroundColor:'rgba(255,255,255,.035)',alignItems:'center',justifyContent:'center'},
  searchBar:{minHeight:48,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:9,backgroundColor:'rgba(18,4,8,.98)',borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.07)'},
  searchInput:{flex:1,height:40,color:colors.ivory,fontFamily:'Poppins_400Regular',fontSize:12},
  searchCount:{fontFamily:'Poppins_600SemiBold',fontSize:9,color:colors.gold},
  contextBar:{minHeight:38,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'rgba(12,2,5,.94)',borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.06)'},
  privateContext:{flexDirection:'row',alignItems:'center',gap:5},
  privateContextText:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:'#CDB5BB'},
  contextAction:{height:28,paddingHorizontal:9,borderRadius:14,flexDirection:'row',alignItems:'center',gap:5,borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  contextActionOn:{backgroundColor:'rgba(212,175,55,.08)',borderColor:'rgba(212,175,55,.22)'},
  contextActionText:{fontFamily:'Poppins_700Bold',fontSize:9,color:'#D8C1C6'},
  contextIcon:{width:28,height:28,borderRadius:14,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  coachPanel:{paddingHorizontal:12,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'rgba(15,3,7,.96)',borderBottomColor:'rgba(255,255,255,.06)'},
  errorBanner:{marginHorizontal:12,marginTop:8,paddingHorizontal:12,paddingVertical:9,borderRadius:12,backgroundColor:'#78162A',flexDirection:'row',alignItems:'center',gap:8},
  errorText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:11,color:colors.ivory},
  dayLabel:{alignSelf:'center',fontFamily:'Poppins_700Bold',fontSize:8.5,letterSpacing:1.2,color:'#BDA5AB',backgroundColor:'rgba(255,255,255,.045)',paddingHorizontal:10,paddingVertical:5,borderRadius:10},
  typingBubble:{alignSelf:'flex-start',flexDirection:'row',gap:4,paddingHorizontal:13,paddingVertical:10,borderRadius:18,borderBottomLeftRadius:6,backgroundColor:'rgba(255,255,255,.055)'},
  typingDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.muted},
  messageGroup:{width:'100%',alignItems:'flex-end'},
  messageActions:{alignSelf:'flex-end',minHeight:40,marginTop:4,paddingHorizontal:6,flexDirection:'row',alignItems:'center',gap:3,backgroundColor:'rgba(28,8,13,.98)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',borderRadius:8},
  reactionButton:{width:33,height:33,alignItems:'center',justifyContent:'center'},
  reactionText:{fontSize:18},
  reactionPill:{position:'absolute',left:-7,bottom:-12,minWidth:30,height:25,paddingHorizontal:5,borderRadius:13,backgroundColor:'#251217',borderWidth:1,borderColor:'rgba(255,255,255,.13)',alignItems:'center',justifyContent:'center'},
  messageActionIcon:{width:33,height:33,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.05)'},
  emptySearch:{alignSelf:'center',alignItems:'center',gap:8,padding:18},
  emptySearchText:{fontFamily:'Poppins_400Regular',fontSize:11,color:colors.muted,textAlign:'center'},
  keyboardWrap:{marginBottom:78,backgroundColor:'rgba(9,0,3,.98)',position:'relative',zIndex:12},
  inputWrap:{flex:1,height:43,borderRadius:22,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',paddingRight:10},
  safetyNudge:{marginHorizontal:10,marginBottom:8,padding:11,borderRadius:18,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.22)',flexDirection:'row',alignItems:'flex-start',gap:9},
  safetyNudgeTitle:{fontFamily:'Poppins_700Bold',fontSize:11.5,color:colors.ivory},
  safetyNudgeBody:{fontFamily:'Poppins_400Regular',fontSize:9.3,lineHeight:13.5,color:'#E7CED3',marginTop:2},
  safetySignalRow:{flexDirection:'row',flexWrap:'wrap',gap:5,marginTop:6},
  safetySignalPill:{paddingHorizontal:7,paddingVertical:4,borderRadius:12,backgroundColor:'rgba(255,255,255,.07)',borderWidth:1,borderColor:'rgba(255,255,255,.10)'},
  safetySignalText:{fontFamily:'Poppins_700Bold',fontSize:7.8,color:'#F5DDE2'},
  safetyNudgeButton:{alignSelf:'center',paddingHorizontal:10,paddingVertical:7,borderRadius:16,backgroundColor:'rgba(229,9,47,.16)',borderWidth:1,borderColor:'rgba(229,9,47,.35)'},
  safetyNudgeButtonText:{fontFamily:'Poppins_700Bold',fontSize:9,color:colors.pinkSoft},
  attachmentTray:{position:'absolute',left:12,right:12,bottom:62,zIndex:20,flexDirection:'row',flexWrap:'wrap',gap:8,padding:12,borderRadius:22,backgroundColor:'rgba(27,8,13,.99)',borderWidth:1,borderColor:'rgba(255,255,255,.12)',shadowColor:'#000',shadowOpacity:.5,shadowRadius:24,shadowOffset:{width:0,height:12},elevation:18},
  attachmentTrayWide:{right:undefined,width:388},
  attachment:{width:'31%',minWidth:72,alignItems:'center',gap:4},
  attachmentIcon:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center'},
  attachmentLabel:{fontFamily:'Poppins_600SemiBold',fontSize:9,color:colors.muted},
  replyPreview:{minHeight:52,marginHorizontal:10,marginTop:7,padding:8,flexDirection:'row',alignItems:'center',gap:9,backgroundColor:'rgba(255,255,255,.05)',borderRadius:8,borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  replyAccent:{width:3,alignSelf:'stretch',borderRadius:2,backgroundColor:colors.gold},
  replyTitle:{fontFamily:'Poppins_700Bold',fontSize:9.5,color:colors.gold},
  replyText:{fontFamily:'Poppins_400Regular',fontSize:10,color:'#D7C4C9',marginTop:2},
  optionList:{gap:7},
  optionRow:{minHeight:64,padding:10,flexDirection:'row',alignItems:'center',gap:10,borderRadius:8,backgroundColor:'rgba(255,255,255,.04)',borderWidth:1,borderColor:'rgba(255,255,255,.07)'},
  optionTitle:{fontFamily:'Poppins_700Bold',fontSize:11.5,color:colors.ivory},
  optionBody:{fontFamily:'Poppins_400Regular',fontSize:9,lineHeight:13,color:colors.muted,marginTop:2},
  sendButton:{width:42,height:42,borderRadius:21,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',shadowColor:colors.pink,shadowOpacity:.3,shadowRadius:10},
  emojiPanel:{maxHeight:250,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.07)',backgroundColor:'rgba(13,3,7,.98)',paddingTop:10},
  emojiHeader:{paddingHorizontal:18,marginBottom:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  emojiTitle:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.ivory},
  emojiCount:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:colors.muted},
  emojiTray:{flexDirection:'row',flexWrap:'wrap',gap:8,paddingHorizontal:16,paddingBottom:14},
  emojiButton:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.06)'},
  emoji:{fontSize:23},
  coachOpen:{height:30,paddingHorizontal:13,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.10)'},
  coachOpenText:{fontFamily:'Poppins_700Bold',fontSize:10,color:'#FFC4CD'},
  mediaBubble:{padding:4,overflow:'hidden',backgroundColor:'#5B0C1C'},
  messageMedia:{width:210,height:235,borderRadius:15,backgroundColor:colors.surface},
  gifBadge:{position:'absolute',left:10,top:10,paddingHorizontal:6,paddingVertical:3,borderRadius:6,backgroundColor:'rgba(13,3,12,.7)'},
  gifBadgeText:{fontFamily:'Poppins_700Bold',fontSize:9,color:colors.ivory},
  messageMeta:{alignSelf:'flex-end',flexDirection:'row',alignItems:'center',gap:3,paddingHorizontal:5,paddingBottom:2},
  giftBubble:{minWidth:210,alignItems:'center',padding:18,backgroundColor:'#3D0B14',borderWidth:1,borderColor:'#892139'},
  giftEmoji:{fontSize:58},
  giftTitle:{fontFamily:'Poppins_700Bold',fontSize:19,color:colors.ivory,marginTop:5},
  giftCaption:{fontFamily:'Poppins_400Regular',fontSize:10.5,color:colors.muted,marginTop:3},
  voiceBubble:{minWidth:245,maxWidth:'74%',padding:9,backgroundColor:'rgba(145,12,35,.94)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  voiceNote:{height:48,flexDirection:'row',alignItems:'center',gap:10},
  voiceWave:{flex:1,height:30,flexDirection:'row',alignItems:'center',gap:3},
  voiceBar:{width:3,borderRadius:2,backgroundColor:'#FFE3E8'},
  voiceDuration:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:'#FFD7DD'},
  locationBubble:{width:255,padding:7,backgroundColor:'rgba(71,13,25,.96)',borderWidth:1,borderColor:'rgba(212,175,55,.25)',overflow:'hidden'},
  locationCard:{gap:9},
  locationMap:{height:116,borderRadius:16,overflow:'hidden',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,255,255,.10)'},
  locationGrid:{...StyleSheet.absoluteFillObject,opacity:.26,backgroundColor:'rgba(255,255,255,.08)'},
  locationInfo:{paddingHorizontal:5,paddingBottom:2},
  locationTitle:{fontFamily:'Poppins_700Bold',fontSize:14,color:colors.ivory},
  locationSubtitle:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:'#FFD7DD',marginTop:2},
  locationFine:{fontFamily:'Poppins_400Regular',fontSize:9.5,color:colors.muted,marginTop:2},
  locationFallback:{padding:9,borderRadius:14,backgroundColor:'rgba(212,175,55,.10)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'flex-start',gap:7},
  locationFallbackText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:9,lineHeight:13,color:'#EED8AC'},
  modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.62)'},
  sheet:{position:'absolute',left:0,right:0,bottom:0,backgroundColor:'#1D070B',borderTopLeftRadius:30,borderTopRightRadius:30,borderWidth:1,borderColor:colors.line,padding:20,gap:18},
  sheetHeader:{flexDirection:'row',alignItems:'center'},
  sheetClose:{marginLeft:'auto',width:40,height:40,borderRadius:20,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},
  gifGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  gifCard:{width:'48%',height:145,borderRadius:16,overflow:'hidden',backgroundColor:colors.surface},
  gifTitle:{position:'absolute',left:8,bottom:8,fontFamily:'Poppins_700Bold',fontSize:10,color:colors.ivory,backgroundColor:'rgba(13,3,12,.65)',paddingHorizontal:7,paddingVertical:4,borderRadius:7},
  balance:{height:44,borderRadius:22,backgroundColor:'#300A11',borderWidth:1,borderColor:'#6A1827',paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:7},
  balanceText:{fontFamily:'Poppins_700Bold',fontSize:13,color:colors.ivory},
  balanceNote:{marginLeft:'auto',fontFamily:'Poppins_400Regular',fontSize:10,color:colors.muted},
  giftGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,paddingBottom:6},
  giftCard:{width:'48%',minHeight:216,borderRadius:22,backgroundColor:'rgba(32,8,13,.92)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',padding:9,alignItems:'center',overflow:'hidden',shadowColor:'#FF2448',shadowOpacity:.10,shadowRadius:12,shadowOffset:{width:0,height:7}},
  giftCardOn:{borderColor:colors.gold,backgroundColor:'#3D0914',shadowColor:colors.gold,shadowOpacity:.25,shadowRadius:16},
  giftPhotoWrap:{width:'100%',height:112,borderRadius:17,overflow:'hidden',backgroundColor:'#130306',borderWidth:1,borderColor:'rgba(255,255,255,.10)',marginBottom:8},
  giftPhoto:{width:'100%',height:'100%'},
  giftPhotoBadge:{position:'absolute',right:8,bottom:8},
  shopGiftEmoji:{fontSize:43},
  giftName:{fontFamily:'Poppins_700Bold',fontSize:12.5,color:colors.ivory,marginTop:5},
  giftDescription:{fontFamily:'Poppins_400Regular',fontSize:9.5,color:colors.muted,marginTop:2},
  coinPill:{marginTop:8,flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:9,paddingVertical:5,borderRadius:12,backgroundColor:'#382B0D'},
  coinText:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.gold},
  billingNote:{fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,textAlign:'center',color:colors.muted},
  giftTabs:{height:52,borderRadius:27,padding:5,backgroundColor:'rgba(255,255,255,.055)',flexDirection:'row',borderWidth:1,borderColor:'rgba(255,255,255,.12)',shadowColor:'#FF2448',shadowOpacity:.10,shadowRadius:12},
  giftTab:{flex:1,borderRadius:22,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,borderWidth:1,borderColor:'transparent'},
  giftTabOn:{backgroundColor:'#A40B28',borderColor:'rgba(255,255,255,.18)',shadowColor:colors.pink,shadowOpacity:.28,shadowRadius:10},
  giftTabText:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:colors.ivory},
  privacyBanner:{padding:12,borderRadius:16,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.28)',flexDirection:'row',alignItems:'center',gap:10},
  privacyBannerText:{flex:1,fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:'#E2D4C1'},
  deliveryMeta:{width:'100%',marginTop:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  priceText:{fontFamily:'Poppins_700Bold',fontSize:13,color:colors.ivory},
  etaText:{fontFamily:'Poppins_600SemiBold',fontSize:8.5,color:colors.gold},
  checkoutBar:{minHeight:66,borderRadius:20,padding:11,backgroundColor:'#2D090F',borderWidth:1,borderColor:colors.line,flexDirection:'row',alignItems:'center',gap:10},
  checkoutTitle:{fontFamily:'Poppins_700Bold',fontSize:11.5,color:colors.ivory},
  checkoutFine:{fontFamily:'Poppins_400Regular',fontSize:8.5,color:colors.muted,marginTop:3},
  checkoutButton:{minWidth:108,height:43,paddingHorizontal:13,borderRadius:22,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',shadowColor:colors.pink,shadowOpacity:.35,shadowRadius:10},
  checkoutButtonText:{fontFamily:'Poppins_700Bold',fontSize:10.5,color:colors.ivory},
  snapBadge:{position:'absolute',left:10,bottom:14,flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:8,paddingVertical:6,borderRadius:12,backgroundColor:'rgba(9,0,2,.75)'},
  snapBadgeText:{fontFamily:'Poppins_700Bold',fontSize:8,color:colors.ivory},
  snapSticker:{position:'absolute',right:15,top:13,fontSize:48},
  stickerBubble:{minWidth:178,alignItems:'center',backgroundColor:'transparent'},
  faceStickerImage:{width:135,height:135,borderRadius:68,borderWidth:4,borderColor:colors.pink},
  faceStickerEmoji:{position:'absolute',right:12,top:88,fontSize:48},
  orderStatus:{marginTop:11,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:9,paddingVertical:6,borderRadius:12,backgroundColor:'rgba(212,175,55,.1)'},
  orderDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.gold},
  orderStatusText:{fontFamily:'Poppins_700Bold',fontSize:7.5,letterSpacing:.6,color:colors.gold},
});

const snapStyles=StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.black},
  header:{height:62,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  headerTitle:{fontFamily:'Poppins_700Bold',fontSize:16,color:colors.ivory},
  sendText:{fontFamily:'Poppins_700Bold',fontSize:13,color:colors.pinkSoft},
  preview:{height:'52%',marginHorizontal:16,borderRadius:28,overflow:'hidden',backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line},
  previewSticker:{position:'absolute',right:22,top:22,fontSize:60},
  previewLabel:{position:'absolute',left:14,bottom:14,flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:11,paddingVertical:8,borderRadius:16,backgroundColor:'rgba(9,0,2,.7)'},
  previewLabelText:{fontFamily:'Poppins_600SemiBold',fontSize:10,color:colors.ivory},
  empty:{flex:1,margin:16,borderRadius:30,padding:28,alignItems:'center',justifyContent:'center',gap:15,borderWidth:1,borderColor:colors.line},
  emptyTitle:{fontFamily:'Poppins_700Bold',fontSize:24,color:colors.ivory,textAlign:'center'},
  emptyActions:{width:'100%',gap:10,marginTop:10},
  errorCard:{marginHorizontal:16,marginTop:10,padding:12,borderRadius:18,backgroundColor:'rgba(228,107,114,.10)',borderWidth:1,borderColor:'rgba(228,107,114,.28)',flexDirection:'row',alignItems:'center',gap:9},
  errorText:{flex:1,fontFamily:'Poppins_700Bold',fontSize:11,lineHeight:16,color:'#FFD3D8'},
  controls:{padding:17,gap:11},
  filterChip:{height:41,paddingHorizontal:12,borderRadius:21,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,flexDirection:'row',alignItems:'center',gap:7},
  filterChipOn:{borderColor:colors.pink,backgroundColor:'#3D0914'},
  filterDot:{width:16,height:16,borderRadius:8,borderWidth:1,borderColor:'rgba(255,255,255,.4)'},
  filterText:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:colors.ivory},
  emojiChoice:{width:48,height:48,borderRadius:24,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.line},
  emojiChoiceOn:{borderColor:colors.pink,backgroundColor:'#4A0A18',transform:[{scale:1.05}]},
  viewOnce:{padding:12,borderRadius:16,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',gap:10},
  faceCreator:{gap:17},
  facePreview:{width:170,height:170,borderRadius:85,alignSelf:'center',overflow:'hidden',borderWidth:4,borderColor:colors.pink,shadowColor:colors.pink,shadowOpacity:.4,shadowRadius:18},
  faceOverlay:{position:'absolute',right:3,bottom:1,fontSize:60},
  facePlaceholder:{height:170,borderRadius:28,borderWidth:1,borderStyle:'dashed',borderColor:colors.pink,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',gap:10},
});

const circleStyles=StyleSheet.create({
  homeBanner:{minHeight:80,borderRadius:20,padding:13,backgroundColor:'rgba(96,12,28,.55)',borderWidth:1,borderColor:'#801B34',flexDirection:'row',alignItems:'center',gap:12},
  bannerFaces:{width:67,height:45,flexDirection:'row',alignItems:'center'},
  tinyFace:{width:39,height:39,borderRadius:20,borderWidth:2,borderColor:'#30070E',alignItems:'center',justifyContent:'center'},
  tinyInitial:{fontFamily:'Poppins_700Bold',fontSize:15,color:colors.ivory},
  tinyPlus:{width:23,height:23,borderRadius:12,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',marginLeft:-8,borderWidth:2,borderColor:'#30070E'},
  bannerTitle:{fontFamily:'Poppins_700Bold',fontSize:12.5,color:colors.ivory},
  bannerBody:{fontFamily:'Poppins_400Regular',fontSize:10.5,lineHeight:15,color:'#D8B0B5',marginTop:3},
  vouchChip:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:10,paddingVertical:7,borderRadius:20,backgroundColor:'rgba(229,9,47,.12)',borderWidth:1,borderColor:'rgba(229,9,47,.38)'},
  vouchChipText:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:'#FFD5DA'},
  circleHeader:{height:58,flexDirection:'row',alignItems:'center'},
  coinBalance:{height:36,borderRadius:18,backgroundColor:'#30240B',borderWidth:1,borderColor:'#66521A',paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:6},
  coinBalanceText:{fontFamily:'Poppins_700Bold',fontSize:11,color:colors.gold},
  circleContent:{paddingBottom:35,gap:18},
  circleHero:{alignItems:'center',gap:11},
  circleOrbit:{width:225,height:135,justifyContent:'center',alignItems:'center'},
  friendAvatar:{position:'absolute',width:67,height:67,borderRadius:34,borderWidth:3,borderColor:'#33070F',alignItems:'center',justifyContent:'center'},
  friendInitial:{fontFamily:'Poppins_700Bold',fontSize:25,color:colors.ivory},
  userCircle:{width:102,height:102,borderRadius:51,backgroundColor:'#6D1022',borderWidth:3,borderColor:colors.pink,alignItems:'center',justifyContent:'center',shadowColor:colors.pink,shadowOpacity:.35,shadowRadius:18},
  userInitial:{fontFamily:'Poppins_700Bold',fontSize:39,color:colors.ivory},
  trustCheck:{position:'absolute',right:1,bottom:6,width:27,height:27,borderRadius:14,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#33070F'},
  progressCard:{gap:14,padding:17,borderRadius:22,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line},
  progressCount:{fontFamily:'Poppins_700Bold',fontSize:11,color:colors.pinkSoft},
  vouchProgress:{height:5,flexDirection:'row',gap:5},
  vouchProgressStep:{flex:1,borderRadius:3,backgroundColor:colors.line},
  vouchProgressOn:{backgroundColor:colors.pink},
  qualityWrap:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:9},
  qualityPill:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:9,paddingVertical:6,borderRadius:14,backgroundColor:'rgba(229,9,47,.1)',borderWidth:1,borderColor:'rgba(229,9,47,.28)'},
  qualityText:{fontFamily:'Poppins_600SemiBold',fontSize:10,color:'#F5D6DA'},
  rewardCard:{padding:15,borderRadius:20,backgroundColor:'#2D230D',borderWidth:1,borderColor:'#67531A',flexDirection:'row',alignItems:'center',gap:12},
  rewardIcon:{width:43,height:43,borderRadius:22,backgroundColor:'#4B3A11',alignItems:'center',justifyContent:'center'},
  demoCard:{padding:16,borderRadius:20,backgroundColor:'#290A12',borderWidth:1,borderColor:colors.line,gap:9},
  demoQuality:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:10,paddingVertical:8,borderRadius:14,backgroundColor:colors.surface2},
  demoQualityText:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:colors.ivory},
  boundaryCard:{padding:14,borderRadius:18,backgroundColor:'rgba(51,11,19,.65)',flexDirection:'row',alignItems:'center',gap:10},
  profileVouch:{padding:16,borderRadius:22,backgroundColor:'#300A12',borderWidth:1,borderColor:'#6D1828',flexDirection:'row',gap:12,marginTop:12},
  vouchSeal:{width:45,height:45,borderRadius:23,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center'},
  profileVouchTitle:{fontFamily:'Poppins_700Bold',fontSize:13.5,color:colors.ivory},
  profileVouchBody:{fontFamily:'Poppins_400Regular',fontSize:11,color:colors.muted,marginTop:3},
});

const discoveryStyles=StyleSheet.create({
  tuneButton:{width:42,height:42,borderRadius:21,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,alignItems:'center',justifyContent:'center',marginLeft:'auto',marginRight:9},
  smartDot:{position:'absolute',right:3,top:3,width:8,height:8,borderRadius:4,backgroundColor:colors.pink,borderWidth:1,borderColor:colors.black},
  crossedSection:{gap:12,paddingVertical:4},
  manageText:{fontFamily:'Poppins_700Bold',fontSize:11,color:colors.pinkSoft},
  crossedCard:{width:190,height:225,borderRadius:22,overflow:'hidden',backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line},
  crossedImage:{width:'100%',height:'100%'},
  crossedInfo:{position:'absolute',left:12,right:12,bottom:12,gap:3},
  crossedName:{fontFamily:'Poppins_700Bold',fontSize:19,color:colors.ivory},
  crossedMeta:{fontFamily:'Poppins_400Regular',fontSize:9.5,color:'#D9C6D4'},
  header:{height:60,flexDirection:'row',alignItems:'center'},
  content:{gap:17,paddingBottom:35},
  neverTrack:{padding:16,borderRadius:20,backgroundColor:'rgba(229,9,47,.08)',borderWidth:1,borderColor:'rgba(229,9,47,.25)',flexDirection:'row',gap:12},
  toggleCard:{padding:16,borderRadius:22,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,flexDirection:'row',alignItems:'center',gap:12},
  toggleIcon:{width:44,height:44,borderRadius:22,backgroundColor:'#430C17',alignItems:'center',justifyContent:'center'},
  switch:{width:48,height:28,borderRadius:14,backgroundColor:'#4D3237',padding:3},
  switchOn:{backgroundColor:colors.pink},
  switchThumb:{width:22,height:22,borderRadius:11,backgroundColor:colors.ivory},
  switchThumbOn:{marginLeft:20},
  activityCard:{gap:15,padding:17,borderRadius:22,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line},
  stats:{flexDirection:'row',gap:8},
  stat:{flex:1,minHeight:72,borderRadius:16,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center',padding:6},
  statValue:{fontFamily:'Poppins_700Bold',fontSize:23,color:colors.ivory},
  statLabel:{fontFamily:'Poppins_400Regular',fontSize:8.5,color:colors.muted,textAlign:'center',marginTop:2},
  clearButton:{height:43,borderRadius:15,borderWidth:1,borderColor:'rgba(228,107,114,.3)',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},
  clearText:{fontFamily:'Poppins_600SemiBold',fontSize:11,color:colors.danger},
  privacyGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  privacyPoint:{width:'48%',minHeight:145,borderRadius:20,backgroundColor:'#200C11',borderWidth:1,borderColor:colors.line,padding:14,gap:7},
  privacyTitle:{fontFamily:'Poppins_700Bold',fontSize:11.5,color:colors.ivory},
  privacyBody:{fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:colors.muted},
});

const dateStyles=StyleSheet.create({
  header:{height:62,flexDirection:'row',alignItems:'center'},
  content:{gap:20,paddingBottom:35},
  hero:{alignItems:'center',gap:11,paddingTop:4},
  heroIcon:{width:62,height:62,borderRadius:31,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',shadowColor:colors.pink,shadowOpacity:.35,shadowRadius:16},
  planStatusCard:{padding:15,borderRadius:24,backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.11)',gap:12,shadowColor:'#FF2448',shadowOpacity:.10,shadowRadius:14},
  planStatusTitle:{fontFamily:'Poppins_700Bold',fontSize:18,color:colors.ivory,marginTop:3},
  planStatusPercent:{fontFamily:'Poppins_700Bold',fontSize:24,color:colors.gold},
  planTrack:{height:6,borderRadius:4,backgroundColor:'rgba(255,255,255,.10)',overflow:'hidden'},
  planFill:{height:'100%',borderRadius:4,backgroundColor:colors.gold},
  planStepRow:{flexDirection:'row',gap:8},
  planStep:{flex:1,minHeight:39,borderRadius:17,backgroundColor:'rgba(12,2,6,.36)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},
  planStepText:{fontFamily:'Poppins_600SemiBold',fontSize:9.3,color:colors.muted},
  areaButton:{padding:15,borderRadius:22,backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',flexDirection:'row',alignItems:'center',gap:12,shadowColor:'#FF2448',shadowOpacity:.10,shadowRadius:12},
  areaButtonOn:{backgroundColor:'#7D1027',borderColor:'rgba(255,255,255,.18)',shadowColor:colors.pink,shadowOpacity:.24,shadowRadius:14},
  category:{height:44,borderRadius:22,paddingHorizontal:14,backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',flexDirection:'row',alignItems:'center',gap:7,shadowColor:'#000',shadowOpacity:.15,shadowRadius:8},
  categoryOn:{backgroundColor:'#A40B28',borderColor:'rgba(255,255,255,.18)',shadowColor:colors.pink,shadowOpacity:.24,shadowRadius:12},
  categoryText:{fontFamily:'Poppins_600SemiBold',fontSize:11.5,color:colors.muted},
  packageSelect:{width:210,minHeight:94,borderRadius:22,padding:12,backgroundColor:'rgba(255,255,255,.055)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',gap:6,shadowColor:'#000',shadowOpacity:.15,shadowRadius:8},
  packageSelectOn:{backgroundColor:'#8D1028',borderColor:'rgba(212,175,55,.38)',shadowColor:colors.gold,shadowOpacity:.18,shadowRadius:12},
  packageSelectTitle:{fontFamily:'Poppins_700Bold',fontSize:11.5,lineHeight:16,color:colors.muted},
  packageSelectMeta:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:colors.gold},
  sampleLabel:{fontFamily:'Poppins_700Bold',fontSize:8,letterSpacing:1,color:colors.gold},
  venueCard:{padding:15,borderRadius:23,backgroundColor:'rgba(32,8,13,.92)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',flexDirection:'row',alignItems:'center',gap:12,shadowColor:'#000',shadowOpacity:.20,shadowRadius:10},
  venueCardOn:{borderColor:colors.gold,backgroundColor:'#3D0B16',shadowColor:colors.gold,shadowOpacity:.20,shadowRadius:14},
  venueEmoji:{fontSize:32},
  venueVibe:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:colors.pinkSoft,marginTop:3,marginBottom:2},
  timeGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},
  timeChip:{width:'48%',minHeight:46,borderRadius:18,backgroundColor:'rgba(255,255,255,.052)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',alignItems:'center',justifyContent:'center',padding:8,shadowColor:'#000',shadowOpacity:.16,shadowRadius:8},
  timeChipOn:{backgroundColor:'#8D1028',borderColor:'rgba(255,255,255,.18)',shadowColor:colors.pink,shadowOpacity:.24,shadowRadius:12},
  timeText:{fontFamily:'Poppins_600SemiBold',fontSize:10.5,color:colors.muted,textAlign:'center'},
  safetyCard:{padding:16,borderRadius:22,backgroundColor:'#21101F',borderWidth:1,borderColor:colors.line,gap:14},
  toggle:{flexDirection:'row',alignItems:'center',gap:10,paddingTop:12,borderTopWidth:1,borderTopColor:colors.line},
  toggleTitle:{fontFamily:'Poppins_600SemiBold',fontSize:12,color:colors.ivory},
  previewCard:{padding:15,borderRadius:22,backgroundColor:'rgba(212,175,55,.06)',borderWidth:1,borderColor:'rgba(212,175,55,.20)',gap:11},
  previewLine:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:14,paddingTop:9,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.08)'},
  previewLabel:{fontFamily:'Poppins_700Bold',fontSize:9,letterSpacing:1.1,color:colors.pinkSoft,textTransform:'uppercase'},
  previewValue:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:12,color:colors.ivory,textAlign:'right'},
  previewFlags:{flexDirection:'row',flexWrap:'wrap',gap:8},
  previewFlag:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:9,paddingVertical:6,borderRadius:15,backgroundColor:'#FFFDFC',borderWidth:1,borderColor:'rgba(255,255,255,.10)'},
  previewFlagText:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:'#F0D6DC'},
  sampleNotice:{padding:13,borderRadius:16,backgroundColor:'#2D230D',borderWidth:1,borderColor:'#5D4B19',flexDirection:'row',gap:9},
  reservationSteps:{flexDirection:'row',gap:7,padding:10,borderRadius:18,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  reservationStep:{flex:1,alignItems:'center',gap:4},
  reservationDot:{width:10,height:10,borderRadius:5,backgroundColor:'rgba(255,255,255,.20)'},
  reservationDotDone:{backgroundColor:'#76D99A'},
  reservationDotActive:{backgroundColor:colors.gold,shadowColor:colors.gold,shadowOpacity:.40,shadowRadius:7},
  reservationStepTitle:{fontFamily:'Poppins_700Bold',fontSize:8.5,color:'#D9C5CD',textAlign:'center'},
  reservationStepBody:{fontFamily:'Poppins_400Regular',fontSize:7.2,lineHeight:10,color:colors.muted,textAlign:'center'},
  reservationPolicy:{gap:7,padding:10,borderRadius:17,backgroundColor:'rgba(212,175,55,.06)',borderWidth:1,borderColor:'rgba(212,175,55,.16)'},
  dateBubble:{minWidth:245,padding:14,backgroundColor:'#410A17',borderWidth:1,borderColor:'#8E1C35'},
  messageDateHeader:{flexDirection:'row',alignItems:'center',gap:10},
  messageCalendar:{width:40,height:40,borderRadius:20,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center'},
  messageEyebrow:{fontFamily:'Poppins_700Bold',fontSize:8,letterSpacing:1,color:colors.pinkSoft},
  messageVenue:{fontFamily:'Poppins_700Bold',fontSize:17,color:colors.ivory,marginTop:2},
  messagePackageTier:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:colors.gold,marginTop:1},
  messageDivider:{height:1,backgroundColor:'rgba(255,255,255,.12)',marginVertical:11},
  messageLine:{flexDirection:'row',alignItems:'center',gap:7,marginBottom:7},
  messageLineText:{fontFamily:'Poppins_400Regular',fontSize:11,color:colors.ivory,flex:1},
  safePill:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:8,paddingVertical:5,borderRadius:12,backgroundColor:'rgba(88,201,128,.12)',marginTop:4},
  safePillText:{fontFamily:'Poppins_600SemiBold',fontSize:9,color:'#9DE0B4'},
  dateFlow:{marginTop:12,padding:10,borderRadius:15,backgroundColor:'rgba(255,255,255,.05)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',justifyContent:'space-between',gap:6},
  dateFlowItem:{flex:1,alignItems:'center',gap:4},
  dateFlowDot:{width:8,height:8,borderRadius:4,backgroundColor:'rgba(255,255,255,.22)'},
  dateFlowDotDone:{backgroundColor:colors.gold,shadowColor:colors.gold,shadowOpacity:.35,shadowRadius:5},
  dateFlowText:{fontFamily:'Poppins_600SemiBold',fontSize:7.5,color:colors.muted,textAlign:'center'},
  dateFlowTextOn:{color:'#F7DFA8'},
  waitingText:{fontFamily:'Poppins_600SemiBold',fontSize:9.5,color:colors.pinkSoft,marginTop:10},
});

const safetyStyles=StyleSheet.create({
  action:{minHeight:67,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:12,borderTopWidth:1,borderTopColor:colors.line},
  actionIcon:{width:42,height:42,borderRadius:21,backgroundColor:'#450C18',alignItems:'center',justifyContent:'center'},
  actionIconDanger:{backgroundColor:'rgba(228,107,114,.1)'},
  confirmCard:{padding:15,borderRadius:22,backgroundColor:'rgba(228,107,114,.08)',borderWidth:1,borderColor:'rgba(228,107,114,.26)',flexDirection:'row',alignItems:'center',gap:12},
  confirmActions:{gap:10},
  reason:{minHeight:49,paddingHorizontal:13,borderRadius:15,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,flexDirection:'row',alignItems:'center'},
  reasonOn:{backgroundColor:'#4A0D1B',borderColor:colors.pink},
  reasonText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:12,color:colors.ivory},
  reportInput:{minHeight:88,borderRadius:16,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,color:colors.ivory,padding:13,fontFamily:'Poppins_400Regular',fontSize:12,textAlignVertical:'top'},
  header:{height:62,flexDirection:'row',alignItems:'center'},
  content:{gap:19,paddingBottom:38},
  hero:{alignItems:'center',gap:10},
  heroShield:{width:72,height:72,borderRadius:36,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',shadowColor:colors.pink,shadowOpacity:.35,shadowRadius:18},
  overview:{flexDirection:'row',gap:8},
  stat:{flex:1,minHeight:82,borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,alignItems:'center',justifyContent:'center',padding:7},
  statValue:{fontFamily:'Poppins_700Bold',fontSize:25,color:colors.ivory},
  statLabel:{fontFamily:'Poppins_400Regular',fontSize:8.5,color:colors.muted,textAlign:'center',marginTop:2},
  section:{gap:10},
  promiseCard:{minHeight:82,padding:14,borderRadius:8,backgroundColor:'rgba(212,175,55,.07)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:12},
  guardianCard:{gap:12,padding:15,borderRadius:22,backgroundColor:'rgba(212,175,55,.07)',borderWidth:1,borderColor:'rgba(212,175,55,.24)'},
  guardianTrack:{height:5,borderRadius:3,backgroundColor:'rgba(255,255,255,.10)',overflow:'hidden'},
  guardianFill:{height:'100%',borderRadius:3,backgroundColor:colors.gold},
  guardianRow:{flexDirection:'row',alignItems:'flex-start',gap:8,paddingTop:9,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.07)'},
  guardianTitle:{fontFamily:'Poppins_700Bold',fontSize:11.5,color:colors.ivory,textTransform:'capitalize'},
  guardianBody:{fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:colors.muted,marginTop:1},
  reportPlanCard:{padding:12,borderRadius:18,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'flex-start',gap:9},
  reportPlanScore:{fontFamily:'Poppins_700Bold',fontSize:13,color:colors.gold,alignSelf:'center'},
  checkInCard:{padding:13,borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,flexDirection:'row',alignItems:'center',gap:10},
  checkInIcon:{width:40,height:40,borderRadius:20,backgroundColor:'#6A185C',alignItems:'center',justifyContent:'center'},
  checkInButton:{height:34,borderRadius:17,backgroundColor:colors.pink,paddingHorizontal:12,alignItems:'center',justifyContent:'center'},
  checkInButtonText:{fontFamily:'Poppins_700Bold',fontSize:10,color:colors.ivory},
  safeDone:{flexDirection:'row',alignItems:'center',gap:4},
  safeDoneText:{fontFamily:'Poppins_600SemiBold',fontSize:10,color:'#8EE0AA'},
  warning:{padding:15,borderRadius:20,backgroundColor:'#30250C',borderWidth:1,borderColor:'#67531A',flexDirection:'row',gap:12},
  dataCard:{padding:15,borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,flexDirection:'row',alignItems:'center',gap:12},
  deleteCard:{padding:15,borderRadius:18,backgroundColor:'rgba(228,107,114,.06)',borderWidth:1,borderColor:'rgba(228,107,114,.3)',flexDirection:'row',alignItems:'center',gap:12},
  toolHero:{padding:14,borderRadius:20,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.24)',flexDirection:'row',alignItems:'center',gap:12},
  sharePreview:{padding:13,borderRadius:18,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  shareText:{fontFamily:'Poppins_600SemiBold',fontSize:12,lineHeight:18,color:'#F5D6DA'},
  checkInWide:{height:42,borderRadius:21,backgroundColor:'rgba(212,175,55,.11)',borderWidth:1,borderColor:'rgba(212,175,55,.30)',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
  checkInWideText:{fontFamily:'Poppins_700Bold',fontSize:11,color:'#F1DFA8'},
  emergencyCard:{padding:14,borderRadius:20,backgroundColor:'rgba(228,107,114,.08)',borderWidth:1,borderColor:'rgba(228,107,114,.28)',flexDirection:'row',alignItems:'center',gap:12},
  emergencyFallback:{padding:12,borderRadius:18,backgroundColor:'rgba(228,107,114,.10)',borderWidth:1,borderColor:'rgba(228,107,114,.30)',flexDirection:'row',alignItems:'flex-start',gap:9},
  emergencyFallbackText:{flex:1,fontFamily:'Poppins_700Bold',fontSize:11,lineHeight:16,color:'#FFD3D7'},
  inlineNotice:{padding:12,borderRadius:17,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.23)',flexDirection:'row',alignItems:'center',gap:8},
  inlineNoticeText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:10.5,lineHeight:15,color:'#EED8AC'},
  deleteConfirm:{padding:15,borderRadius:22,backgroundColor:'rgba(228,107,114,.08)',borderWidth:1,borderColor:'rgba(228,107,114,.28)',flexDirection:'row',alignItems:'center',gap:12},
  toolList:{gap:8},
  toolRow:{padding:11,borderRadius:16,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.07)',flexDirection:'row',alignItems:'center',gap:9},
  toolRowText:{flex:1,fontFamily:'Poppins_600SemiBold',fontSize:11,lineHeight:16,color:'#EFD7DC'},
  localToggle:{padding:13,borderRadius:18,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',flexDirection:'row',alignItems:'center',gap:11},
  localToggleTitle:{fontFamily:'Poppins_700Bold',fontSize:12.5,color:colors.ivory},
  privacySummary:{padding:12,borderRadius:16,backgroundColor:'rgba(212,175,55,.08)',borderWidth:1,borderColor:'rgba(212,175,55,.22)',flexDirection:'row',alignItems:'center',gap:9},
  exportReady:{padding:13,borderRadius:18,backgroundColor:'rgba(88,201,128,.10)',borderWidth:1,borderColor:'rgba(88,201,128,.28)',flexDirection:'row',alignItems:'center',gap:9},
  exportReadyText:{flex:1,fontFamily:'Poppins_700Bold',fontSize:11.5,lineHeight:16,color:'#A7E6BA'},
  disclaimer:{fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:15,color:colors.muted,textAlign:'center'},
});

const cityDensityStyles=StyleSheet.create({
  memberCard:{gap:12,padding:15,borderRadius:20,backgroundColor:'rgba(212,175,55,.065)',borderWidth:1,borderColor:'rgba(212,175,55,.22)'},
  memberMarketList:{gap:8},
  memberMarketRow:{flexDirection:'row',alignItems:'center',gap:9,padding:10,borderRadius:14,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.07)'},
  memberMarketName:{fontFamily:'Poppins_700Bold',fontSize:11.5,color:colors.ivory},
  memberMarketMeta:{fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:colors.muted,marginTop:1},
  privacyRow:{flexDirection:'row',alignItems:'flex-start',gap:8,paddingTop:9,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.08)'},
  privacyText:{flex:1,fontFamily:'Poppins_400Regular',fontSize:9.5,lineHeight:14,color:'#D8C7CC'},
  auditCard:{gap:12,padding:15,borderRadius:20,backgroundColor:'rgba(212,175,55,.055)',borderWidth:1,borderColor:'rgba(212,175,55,.22)'},
  marketGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  marketCard:{flexGrow:1,flexBasis:145,minHeight:112,gap:4,padding:11,borderRadius:15,backgroundColor:'rgba(255,255,255,.045)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},
  marketName:{fontFamily:'Poppins_700Bold',fontSize:12,color:colors.ivory},
  marketScore:{fontFamily:'Poppins_700Bold',fontSize:11,color:colors.gold},
  marketStatus:{fontFamily:'Poppins_700Bold',fontSize:8.5,color:colors.pinkSoft,textTransform:'uppercase'},
  marketBody:{fontFamily:'Poppins_400Regular',fontSize:9,lineHeight:13,color:colors.muted},
});

const noticeStyles=StyleSheet.create({
  sheet:{position:'absolute',left:14,right:14,bottom:14,borderRadius:28,padding:16,gap:14,backgroundColor:'rgba(22,4,9,.98)',borderWidth:1,borderColor:'rgba(255,255,255,.10)',shadowColor:colors.pink,shadowOpacity:.22,shadowRadius:22},
  hero:{flexDirection:'row',alignItems:'center',gap:12},
  title:{fontFamily:'Poppins_700Bold',fontSize:18,color:colors.ivory},
  body:{fontFamily:'Poppins_400Regular',fontSize:12.5,lineHeight:18,color:'#E1C6CE',marginTop:3},
  actions:{gap:9},
});
