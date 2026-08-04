import { appEnvironment, isSupabaseConfigured, requiresRealBackend, supabase } from '../lib/supabase';
import { buildRuntimeCapabilities } from '../domain/runtimeCapabilities';

export type GiftDeliveryProvider = 'demo_local' | 'doordash_drive' | 'uber_direct';
export type GiftServiceLevel = 'on_demand' | 'same_day' | 'scheduled';
export type GiftEtaConfidence = 'fast' | 'same_day' | 'scheduled';
export type GiftDeliveryWindow = 'asap' | 'today' | 'scheduled';
export type GiftConfirmationStatus = 'sent' | 'queued' | 'preview_only' | 'failed';
export type GiftFulfillmentStatus =
  | 'recipient_pending'
  | 'recipient_accepted'
  | 'payment_authorized'
  | 'merchant_preparing'
  | 'courier_assigned'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'
  | 'failed';
export type GiftStepStatus = 'done' | 'active' | 'pending';

export type GiftFulfillmentStep = {
  key: 'request' | 'recipient' | 'payment' | 'partner' | 'delivery';
  label: string;
  body: string;
  status: GiftStepStatus;
  eta?: string;
};

export type GiftOrderQuote = {
  quoteId: string;
  provider: GiftDeliveryProvider;
  providerLabel: string;
  productId: string;
  productName: string;
  serviceLevel: GiftServiceLevel;
  serviceLevelLabel: string;
  itemSubtotalCents: number;
  deliveryFeeCents: number;
  distanceFeeCents: number;
  rushFeeCents: number;
  smallOrderFeeCents: number;
  serviceFeeCents: number;
  estimatedTaxCents: number;
  discountCents: number;
  totalCents: number;
  currency: 'USD';
  pricingVersion: string;
  quotedAt: string;
  deliveryCity: string;
  deliveryWindow: GiftDeliveryWindow;
  deliveryWindowLabel: string;
  estimatedDistanceMiles: number;
  exactRoutePending: boolean;
  etaMinutesMin: number;
  etaMinutesMax: number;
  etaLabel: string;
  etaConfidence: GiftEtaConfidence;
  pickupPartnerName: string;
  providerRecommendation: string;
  providerCapability: string;
  paymentPolicy: string;
  cancellationPolicy: string;
  supportPolicy: string;
  acceptanceWindowMinutes: number;
  quoteValidMinutes: number;
  recipientPrivacy: string;
  acceptanceExpiresAt: string;
  expiresAt: string;
};

export type GiftConfirmationChannel = {
  channel: 'in_app' | 'email';
  audience: 'sender' | 'recipient';
  label: string;
  status: GiftConfirmationStatus;
  detail: string;
};

export type GiftConfirmationPlan = {
  channels: GiftConfirmationChannel[];
  emailAdapter: 'developer_required' | 'configured';
  senderReceiptLabel: string;
  recipientRequestLabel: string;
};

export type GiftFulfillmentPlanItem = {
  title: string;
  body: string;
  owner: 'app' | 'recipient' | 'payment' | 'provider' | 'support';
  ready: boolean;
};

export type GiftOrderSummary = {
  headline: string;
  body: string;
  cta: string;
  tone: 'waiting' | 'active' | 'success' | 'support';
};

export type GiftOrderRequest = {
  productId: string;
  recipientId: string;
  productName?: string;
  recipientName?: string;
  senderDisplayName?: string;
  senderDisplayMode?: 'first_name';
  recipientAddressMode?: 'recipient_supplied_private';
  occasion?: string;
  deliveryWindow?: GiftDeliveryWindow;
  deliveryCity?: string;
  deliveryDistanceMilesEstimate?: number;
  priceCents?: number;
  etaHint?: string;
  note?: string;
};

export type GiftOrderResponse = {
  orderId: string;
  demo: boolean;
  status: GiftFulfillmentStatus;
  deliveryStatus: GiftFulfillmentStatus;
  provider: GiftDeliveryProvider;
  trackingUrl?: string;
  quote: GiftOrderQuote;
  steps: GiftFulfillmentStep[];
  confirmations: GiftConfirmationPlan;
};

type ProductRule = {
  serviceLevel: GiftServiceLevel;
  prepMinutes: number;
  travelMinutes: number;
  windowBufferMinutes: number;
  deliveryFeeCents: number;
  cutoffHour: number;
  pickupPartnerName: string;
};

const giftsApiUrl=process.env.EXPO_PUBLIC_GIFTS_API_URL?.replace(/\/$/,'')??'';
export const giftOrderingConfigured=Boolean(giftsApiUrl);
const giftRuntimeCapabilities=buildRuntimeCapabilities({
  appEnvironment,
  requiresRealBackend,
  paymentsConfigured:false,
  giftOrderingConfigured,
  storeBillingConnected:false,
  verifiedVouchRewardsConnected:false,
});
export const physicalGiftOrderingMode=giftRuntimeCapabilities.physicalGiftOrdering;
export const digitalGiftWalletMode=giftRuntimeCapabilities.digitalGiftWallet;
export const vouchRewardsMode=giftRuntimeCapabilities.vouchRewards;

const providerLabels:Record<GiftDeliveryProvider,string>={
  demo_local:physicalGiftOrderingMode==='blocked'?'Delivery unavailable':'Demo local partner',
  doordash_drive:'DoorDash Drive',
  uber_direct:'Uber Direct',
};

const serviceLevelLabels:Record<GiftServiceLevel,string>={
  on_demand:'On-demand courier',
  same_day:'Same-day delivery',
  scheduled:'Scheduled delivery',
};

const productRules:Record<string,ProductRule>={
  'ruby-roses':{serviceLevel:'same_day',prepMinutes:35,travelMinutes:45,windowBufferMinutes:45,deliveryFeeCents:899,cutoffHour:20,pickupPartnerName:'Premium florist network'},
  'gelato-night':{serviceLevel:'on_demand',prepMinutes:15,travelMinutes:28,windowBufferMinutes:24,deliveryFeeCents:699,cutoffHour:22,pickupPartnerName:'Local dessert partner'},
  'chai-duo':{serviceLevel:'on_demand',prepMinutes:12,travelMinutes:30,windowBufferMinutes:25,deliveryFeeCents:599,cutoffHour:21,pickupPartnerName:'Cafe partner'},
  'artisan-chocolate':{serviceLevel:'same_day',prepMinutes:25,travelMinutes:40,windowBufferMinutes:40,deliveryFeeCents:799,cutoffHour:20,pickupPartnerName:'Chocolate boutique'},
  'mini-cake':{serviceLevel:'scheduled',prepMinutes:180,travelMinutes:1440,windowBufferMinutes:360,deliveryFeeCents:899,cutoffHour:17,pickupPartnerName:'Bakery partner'},
  orchid:{serviceLevel:'scheduled',prepMinutes:120,travelMinutes:1440,windowBufferMinutes:360,deliveryFeeCents:799,cutoffHour:18,pickupPartnerName:'Plant studio'},
  'book-date':{serviceLevel:'scheduled',prepMinutes:90,travelMinutes:1440,windowBufferMinutes:360,deliveryFeeCents:699,cutoffHour:18,pickupPartnerName:'Bookstore partner'},
  'self-care':{serviceLevel:'scheduled',prepMinutes:120,travelMinutes:1440,windowBufferMinutes:360,deliveryFeeCents:799,cutoffHour:18,pickupPartnerName:'Wellness gift partner'},
  candle:{serviceLevel:'same_day',prepMinutes:25,travelMinutes:38,windowBufferMinutes:42,deliveryFeeCents:699,cutoffHour:20,pickupPartnerName:'Home fragrance partner'},
  fruit:{serviceLevel:'same_day',prepMinutes:30,travelMinutes:42,windowBufferMinutes:44,deliveryFeeCents:799,cutoffHour:19,pickupPartnerName:'Fresh market partner'},
  card:{serviceLevel:'scheduled',prepMinutes:45,travelMinutes:1440,windowBufferMinutes:360,deliveryFeeCents:499,cutoffHour:17,pickupPartnerName:'Stationery partner'},
  'movie-night':{serviceLevel:'same_day',prepMinutes:28,travelMinutes:40,windowBufferMinutes:35,deliveryFeeCents:799,cutoffHour:21,pickupPartnerName:'Snack partner'},
};

const fallbackRule:ProductRule={serviceLevel:'same_day',prepMinutes:30,travelMinutes:45,windowBufferMinutes:45,deliveryFeeCents:799,cutoffHour:20,pickupPartnerName:'Local gift partner'};

export function formatGiftMoney(cents:number){
  return `$${(cents/100).toFixed(cents%100===0?0:2)}`;
}

export function estimateGiftOrderQuote(input:GiftOrderRequest, now=new Date(), provider:GiftDeliveryProvider='demo_local'):GiftOrderQuote{
  const rule=productRules[input.productId]??fallbackRule;
  const priceCents=input.priceCents??0;
  const deliveryWindow=input.deliveryWindow??'asap';
  const estimatedDistanceMiles=clamp(input.deliveryDistanceMilesEstimate??5,1,25);
  const includedMiles=5;
  const distanceFeeCents=Math.max(0,Math.ceil(estimatedDistanceMiles-includedMiles)*85);
  const rushFeeCents=deliveryWindow==='asap'&&rule.serviceLevel!=='scheduled'?299:0;
  const smallOrderFeeCents=priceCents>0&&priceCents<2500?199:0;
  const discountCents=priceCents>=6000?Math.min(499,rule.deliveryFeeCents):0;
  const isAfterCutoff=now.getHours()>=rule.cutoffHour;
  const baseMin=rule.prepMinutes+rule.travelMinutes;
  const requestedDelay=deliveryWindow==='scheduled'?24*60:deliveryWindow==='today'?90:0;
  const serviceDelay=Math.max(requestedDelay,isAfterCutoff?minutesUntilNextWindow(now,rule.serviceLevel):0);
  const etaMinutesMin=serviceDelay+baseMin;
  const etaMinutesMax=etaMinutesMin+rule.windowBufferMinutes;
  const deliveryFeeCents=rule.deliveryFeeCents+distanceFeeCents;
  const serviceFeeCents=Math.max(199,Math.round(priceCents*.065));
  const taxableCents=priceCents+deliveryFeeCents+rushFeeCents+smallOrderFeeCents+serviceFeeCents-discountCents;
  const estimatedTaxCents=Math.max(0,Math.round(taxableCents*.0875));
  const totalCents=taxableCents+estimatedTaxCents;
  return {
    quoteId:`quote-${input.productId}-${now.getTime()}`,
    provider,
    providerLabel:providerLabels[provider],
    productId:input.productId,
    productName:input.productName??input.productId,
    serviceLevel:rule.serviceLevel,
    serviceLevelLabel:serviceLevelLabels[rule.serviceLevel],
    itemSubtotalCents:priceCents,
    deliveryFeeCents,
    distanceFeeCents,
    rushFeeCents,
    smallOrderFeeCents,
    serviceFeeCents,
    estimatedTaxCents,
    discountCents,
    totalCents,
    currency:'USD',
    pricingVersion:'gift-quote-2026-08-v2',
    quotedAt:now.toISOString(),
    deliveryCity:input.deliveryCity?.trim()||'Recipient city',
    deliveryWindow,
    deliveryWindowLabel:giftDeliveryWindowLabel(deliveryWindow),
    estimatedDistanceMiles,
    exactRoutePending:true,
    etaMinutesMin,
    etaMinutesMax,
    etaLabel:formatEtaLabel(etaMinutesMin,etaMinutesMax,now),
    etaConfidence:giftEtaConfidence(rule.serviceLevel,etaMinutesMax),
    pickupPartnerName:rule.pickupPartnerName,
    providerRecommendation:giftProviderRecommendation(rule.serviceLevel),
    providerCapability:giftProviderCapability(rule.serviceLevel,provider),
    paymentPolicy:'Sender is not charged until the recipient accepts privately and the provider confirms availability.',
    cancellationPolicy:'Free cancellation before recipient acceptance. After provider confirmation, refunds follow merchant/courier policy.',
    supportPolicy:'If a courier fails or the recipient declines, DestinyOne support can cancel, retry, or refund from the order record.',
    acceptanceWindowMinutes:30,
    quoteValidMinutes:10,
    recipientPrivacy:'Recipient accepts privately. Address is never shown to the sender.',
    acceptanceExpiresAt:new Date(now.getTime()+30*60*1000).toISOString(),
    expiresAt:new Date(now.getTime()+10*60*1000).toISOString(),
  };
}

export function buildGiftSteps(status:GiftFulfillmentStatus, quote:GiftOrderQuote):GiftFulfillmentStep[]{
  const rank:Record<GiftFulfillmentStatus,number>={
    recipient_pending:1,
    recipient_accepted:2,
    payment_authorized:3,
    merchant_preparing:4,
    courier_assigned:4,
    picked_up:5,
    delivered:6,
    cancelled:0,
    failed:0,
  };
  const current=rank[status]??1;
  const step=(position:number):GiftStepStatus=>status==='cancelled'||status==='failed'?'pending':current>position?'done':current===position?'active':'pending';
  return [
    {key:'request',label:'Gift request',body:'Sender chose the gift and note.',status:step(1)},
    {key:'recipient',label:'Private acceptance',body:'Recipient confirms delivery address privately.',status:step(2)},
    {key:'payment',label:'Secure payment',body:'Apple Pay / card is authorized after acceptance.',status:step(3)},
    {key:'partner',label:'Partner prepares',body:`${quote.pickupPartnerName} prepares the order.`,status:step(4),eta:quote.serviceLevel==='on_demand'?'15–30 min':'Same-day window'},
    {key:'delivery',label:'Courier delivery',body:`Estimated arrival ${quote.etaLabel}.`,status:step(5),eta:quote.etaLabel},
  ];
}

export function buildGiftFulfillmentPlan(quote:GiftOrderQuote):GiftFulfillmentPlanItem[]{
  return [
    {
      title:'Recipient approval',
      body:`They have ${quote.acceptanceWindowMinutes} minutes to accept privately. Their address stays hidden.`,
      owner:'recipient',
      ready:true,
    },
    {
      title:'Payment after approval',
      body:'Payment starts only after acceptance and availability are confirmed.',
      owner:'payment',
      ready:true,
    },
    {
      title:'Delivery partner',
      body:quote.providerCapability,
      owner:'provider',
      ready:quote.provider!=='demo_local',
    },
    {
      title:'Delivery updates',
      body:'Chat updates show when the gift is accepted, prepared, picked up and delivered.',
      owner:'app',
      ready:quote.provider!=='demo_local',
    },
  ];
}

export function buildGiftConfirmationPlan(demo:boolean):GiftConfirmationPlan{
  const backendStatus:GiftConfirmationStatus=demo?'preview_only':'queued';
  const backendDetail=demo
    ?'Preview is ready. Your developer connects the transactional email adapter before launch.'
    :'Queued by DestinyOne for secure delivery.';
  return {
    emailAdapter:demo?'developer_required':'configured',
    senderReceiptLabel:'Gift request and price receipt',
    recipientRequestLabel:'Private gift acceptance request',
    channels:[
      {channel:'in_app',audience:'sender',label:'Your in-app receipt',status:'sent',detail:'The order record is available in Chat.'},
      {channel:'in_app',audience:'recipient',label:'Recipient in-app request',status:backendStatus,detail:demo?'Preview contract is ready for the recipient notification service.':backendDetail},
      {channel:'email',audience:'sender',label:'Sender email confirmation',status:backendStatus,detail:backendDetail},
      {channel:'email',audience:'recipient',label:'Recipient email request',status:backendStatus,detail:backendDetail},
    ],
  };
}

export function giftOrderSummary(status:GiftFulfillmentStatus, quote:GiftOrderQuote):GiftOrderSummary{
  if(status==='delivered')return {headline:'Delivered beautifully',body:`${quote.productName} arrived. Ask support if anything looks wrong.`,cta:'View receipt',tone:'success'};
  if(status==='failed')return {headline:'Needs support',body:'The delivery partner could not complete this order. Support should review refund/retry options.',cta:'Contact support',tone:'support'};
  if(status==='cancelled')return {headline:'Order cancelled',body:'No delivery is active. Any eligible hold should be released by the provider.',cta:'View policy',tone:'support'};
  if(status==='recipient_pending')return {headline:'Waiting for private acceptance',body:`${quote.productName} is held for ${quote.quoteValidMinutes} min. ${quote.recipientPrivacy}`,cta:'Share request',tone:'waiting'};
  if(status==='recipient_accepted')return {headline:'Recipient accepted',body:'Address is securely tokenized. Payment authorization can begin.',cta:'Authorize payment',tone:'active'};
  if(status==='payment_authorized')return {headline:'Payment authorized',body:`${quote.pickupPartnerName} can now confirm item availability.`,cta:'Submit to partner',tone:'active'};
  if(status==='merchant_preparing'||status==='courier_assigned')return {headline:'Partner is preparing',body:`ETA ${quote.etaLabel}. Tracking updates appear in chat.`,cta:'Track order',tone:'active'};
  return {headline:'Out for delivery',body:`Estimated arrival ${quote.etaLabel}. Recipient address remains private.`,cta:'Track order',tone:'active'};
}

/**
 * The client talks only to DestinyOne's gift BFF. In production the server owns
 * pricing, recipient consent, private address collection, payment authorization,
 * fulfillment-provider submission, webhooks and refunds. The recipient sees the
 * sender's approved display name; private delivery data is never returned to the
 * sender or exposed in the client request.
 */
export async function createPhysicalGiftOrder(input:GiftOrderRequest):Promise<GiftOrderResponse>{
  const localQuote=estimateGiftOrderQuote(input);
  if(physicalGiftOrderingMode==='blocked'){
    throw new Error('Physical gift delivery is unavailable. No order or payment was created.');
  }
  if(!giftOrderingConfigured){
    await new Promise(resolve=>setTimeout(resolve,850));
    const orderId=`demo-gift-${Date.now()}`;
    return {
      orderId,
      demo:true,
      status:'recipient_pending',
      deliveryStatus:'recipient_pending',
      provider:'demo_local',
      trackingUrl:`https://destinyone.local/gifts/${orderId}`,
      quote:localQuote,
      steps:buildGiftSteps('recipient_pending',localQuote),
      confirmations:buildGiftConfirmationPlan(true),
    };
  }
  if(!isSupabaseConfigured)throw new Error('Sign in is required for secure gift checkout.');
  const {data}=await supabase.auth.getSession();
  const token=data.session?.access_token;
  if(!token)throw new Error('Your session expired. Please sign in again.');
  const response=await fetch(`${giftsApiUrl}/create-gift-order`,{
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
    body:JSON.stringify(input),
  });
  if(!response.ok){
    const payload=await safeJson(response);
    throw new Error(typeof payload.error==='string'?payload.error:'Gift checkout is temporarily unavailable.');
  }
  const payload=await response.json() as Partial<GiftOrderResponse>;
  if(!payload.orderId)throw new Error('The gift service returned an incomplete response.');
  const quote=payload.quote??localQuote;
  const status=payload.status??'recipient_pending';
  return {
    orderId:payload.orderId,
    demo:Boolean(payload.demo),
    status,
    deliveryStatus:payload.deliveryStatus??status,
    provider:payload.provider??quote.provider,
    trackingUrl:payload.trackingUrl,
    quote,
    steps:payload.steps??buildGiftSteps(status,quote),
    confirmations:payload.confirmations??buildGiftConfirmationPlan(Boolean(payload.demo)),
  };
}

function giftDeliveryWindowLabel(deliveryWindow:GiftDeliveryWindow){
  if(deliveryWindow==='today')return 'Later today';
  if(deliveryWindow==='scheduled')return 'Scheduled delivery';
  return 'As soon as possible';
}

function clamp(value:number,min:number,max:number){
  return Math.min(max,Math.max(min,value));
}

function minutesUntilNextWindow(now:Date, serviceLevel:GiftServiceLevel){
  const next=new Date(now);
  next.setDate(now.getDate()+1);
  next.setHours(serviceLevel==='on_demand'?10:11,0,0,0);
  return Math.max(0,Math.ceil((next.getTime()-now.getTime())/60000));
}

function giftProviderRecommendation(serviceLevel:GiftServiceLevel){
  if(serviceLevel==='on_demand')return 'Use an on-demand courier partner for desserts, coffee and quick local surprises.';
  if(serviceLevel==='same_day')return 'Use a local merchant network with same-day courier pickup after recipient acceptance.';
  return 'Use scheduled fulfillment so fragile or customized gifts arrive in a clean delivery window.';
}

function giftProviderCapability(serviceLevel:GiftServiceLevel, provider:GiftDeliveryProvider){
  if(provider==='demo_local')return 'Preview mode uses a demo partner. Production can route to DoorDash Drive, Uber Direct, or a florist API by city.';
  if(provider==='doordash_drive')return serviceLevel==='on_demand'?'DoorDash Drive is best for quick dessert/café courier orders.':'DoorDash Drive can handle same-day merchant pickup where coverage exists.';
  return serviceLevel==='scheduled'?'Uber Direct can support scheduled local delivery windows after merchant confirmation.':'Uber Direct is useful for fast local delivery when courier supply is available.';
}

function giftEtaConfidence(serviceLevel:GiftServiceLevel, etaMinutesMax:number):GiftEtaConfidence{
  if(serviceLevel==='scheduled'||etaMinutesMax>=240)return 'scheduled';
  if(serviceLevel==='same_day')return 'same_day';
  return 'fast';
}

function formatEtaLabel(min:number,max:number,now:Date){
  if(max<180)return `${min}–${max} min`;
  const start=new Date(now.getTime()+min*60000);
  const end=new Date(now.getTime()+max*60000);
  const day=start.toDateString()===now.toDateString()?'Today':isTomorrow(start,now)?'Tomorrow':start.toLocaleDateString(undefined,{weekday:'short'});
  return `${day} ${formatTime(start)}–${formatTime(end)}`;
}

function formatTime(date:Date){
  return date.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
}

function isTomorrow(date:Date,now:Date){
  const tomorrow=new Date(now);
  tomorrow.setDate(now.getDate()+1);
  return date.toDateString()===tomorrow.toDateString();
}

async function safeJson(response:Response):Promise<Record<string,unknown>>{
  try{return await response.json() as Record<string,unknown>}catch{return {}}
}
