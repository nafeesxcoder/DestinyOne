const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};

type GiftDeliveryProvider='demo_local'|'doordash_drive'|'uber_direct';
type GiftServiceLevel='on_demand'|'same_day'|'scheduled';
type GiftDeliveryWindow='asap'|'today'|'scheduled';
type GiftStatus='recipient_pending'|'recipient_accepted'|'payment_authorized'|'merchant_preparing'|'courier_assigned'|'picked_up'|'delivered'|'cancelled'|'failed';

type CatalogItem={name:string;amount:number;serviceLevel:GiftServiceLevel;prepMinutes:number;travelMinutes:number;windowBufferMinutes:number;deliveryFeeCents:number;cutoffHour:number;pickupPartnerName:string};

const provider=(Deno.env.get('GIFT_DELIVERY_PROVIDER') as GiftDeliveryProvider | null)??'demo_local';
const providerLabels:Record<GiftDeliveryProvider,string>={
  demo_local:'Demo local partner',
  doordash_drive:'DoorDash Drive',
  uber_direct:'Uber Direct',
};
const serviceLevelLabels:Record<GiftServiceLevel,string>={
  on_demand:'On-demand courier',
  same_day:'Same-day delivery',
  scheduled:'Scheduled delivery',
};

const catalog:Record<string,CatalogItem>={
  'ruby-roses':{name:'Velvet Ruby Roses',amount:4900,serviceLevel:'same_day',prepMinutes:35,travelMinutes:45,windowBufferMinutes:45,deliveryFeeCents:899,cutoffHour:20,pickupPartnerName:'Premium florist network'},
  'gelato-night':{name:'Gelato Date Night',amount:2600,serviceLevel:'on_demand',prepMinutes:15,travelMinutes:28,windowBufferMinutes:24,deliveryFeeCents:699,cutoffHour:22,pickupPartnerName:'Local dessert partner'},
  'chai-duo':{name:'Chai & Coffee for Two',amount:2200,serviceLevel:'on_demand',prepMinutes:12,travelMinutes:30,windowBufferMinutes:25,deliveryFeeCents:599,cutoffHour:21,pickupPartnerName:'Cafe partner'},
  'artisan-chocolate':{name:'Artisan Love Chocolates',amount:3600,serviceLevel:'same_day',prepMinutes:25,travelMinutes:40,windowBufferMinutes:40,deliveryFeeCents:799,cutoffHour:20,pickupPartnerName:'Chocolate boutique'},
  'mini-cake':{name:'Celebration Mini Cake',amount:4200,serviceLevel:'scheduled',prepMinutes:180,travelMinutes:1440,windowBufferMinutes:360,deliveryFeeCents:899,cutoffHour:17,pickupPartnerName:'Bakery partner'},
  orchid:{name:'Love Grows Orchid',amount:3900,serviceLevel:'scheduled',prepMinutes:120,travelMinutes:1440,windowBufferMinutes:360,deliveryFeeCents:799,cutoffHour:18,pickupPartnerName:'Plant studio'},
  'book-date':{name:'Bookstore Love Story',amount:3200,serviceLevel:'scheduled',prepMinutes:90,travelMinutes:1440,windowBufferMinutes:360,deliveryFeeCents:699,cutoffHour:18,pickupPartnerName:'Bookstore partner'},
  'self-care':{name:'Self-care for Two',amount:5800,serviceLevel:'scheduled',prepMinutes:120,travelMinutes:1440,windowBufferMinutes:360,deliveryFeeCents:799,cutoffHour:18,pickupPartnerName:'Wellness gift partner'},
  candle:{name:'Candlelight Romance',amount:3400,serviceLevel:'same_day',prepMinutes:25,travelMinutes:38,windowBufferMinutes:42,deliveryFeeCents:699,cutoffHour:20,pickupPartnerName:'Home fragrance partner'},
  fruit:{name:'Strawberry Sunrise Basket',amount:4500,serviceLevel:'same_day',prepMinutes:30,travelMinutes:42,windowBufferMinutes:44,deliveryFeeCents:799,cutoffHour:19,pickupPartnerName:'Fresh market partner'},
  card:{name:'Handwritten Love Letter',amount:1800,serviceLevel:'scheduled',prepMinutes:45,travelMinutes:1440,windowBufferMinutes:360,deliveryFeeCents:499,cutoffHour:17,pickupPartnerName:'Stationery partner'},
  'movie-night':{name:'Cozy Movie Night',amount:4400,serviceLevel:'same_day',prepMinutes:28,travelMinutes:40,windowBufferMinutes:35,deliveryFeeCents:799,cutoffHour:21,pickupPartnerName:'Snack partner'},
};

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(!req.headers.get('Authorization'))return json({error:'Authentication required'},401);
  try{
    const {productId,recipientId,note,senderDisplayName,senderDisplayMode,recipientAddressMode,occasion,deliveryWindow,deliveryCity,deliveryDistanceMilesEstimate}=await req.json() as {productId?:string;recipientId?:string;note?:string;senderDisplayName?:string;senderDisplayMode?:string;recipientAddressMode?:string;occasion?:string;deliveryWindow?:GiftDeliveryWindow;deliveryCity?:string;deliveryDistanceMilesEstimate?:number};
    const product=productId?catalog[productId]:undefined;
    if(!product||!recipientId)return json({error:'Unknown product or recipient'},400);
    if(note&&note.length>160)return json({error:'Gift note is too long'},400);
    if(senderDisplayMode&&senderDisplayMode!=='first_name')return json({error:'A visible sender first name is required'},400);
    if(recipientAddressMode&&recipientAddressMode!=='recipient_supplied_private')return json({error:'Recipient-private delivery consent is required'},400);
    if(deliveryWindow&&!['asap','today','scheduled'].includes(deliveryWindow))return json({error:'Unknown delivery window'},400);

    const quote=buildQuote(productId!,product,new Date(),provider,deliveryWindow??'asap',deliveryCity,deliveryDistanceMilesEstimate);
    const orderId=`gift-${crypto.randomUUID()}`;
    const trackingUrl=`https://destinyone.app/gifts/${orderId}`;

    // Production flow:
    // 1) Insert gift_order with recipient_pending.
    // 2) Notify recipient in-app + email to accept and enter/confirm address privately.
    // 3) After acceptance, authorize payment for quote.totalCents.
    // 4) Submit delivery to DoorDash Drive or Uber Direct using server secrets.
    // 5) Webhooks update gift_order_events and chat metadata.
    // 6) Queue sender receipt + recipient request through the configured
    //    transactional-email adapter (Resend/Postmark/SendGrid) using templates.
    //
    // DoorDash Drive supports creating delivery quotes and accepting them to
    // create a delivery. Uber Direct supports courier delivery requests for
    // merchant apps. Both should be called only after recipient consent.
    // Production must resolve the visible sender name from auth.uid + profiles,
    // not trust a client-supplied display name. The optional value is preview UX.
    console.info('Gift request created',{orderId,productId,recipientId,senderDisplayMode:senderDisplayMode??'first_name',recipientAddressMode:recipientAddressMode??'recipient_supplied_private',occasion,deliveryWindow,noteLength:note?.length??0,provider,amount:product.amount,total:quote.totalCents});

    return json({
      orderId,
      demo:provider==='demo_local',
      status:'recipient_pending',
      deliveryStatus:'recipient_pending',
      provider,
      trackingUrl,
      quote,
      steps:buildSteps('recipient_pending',quote),
      confirmations:buildConfirmations(provider==='demo_local'),
    });
  }catch(error){
    console.error('Gift order error',error);
    return json({error:'Invalid gift request'},400);
  }
});

function buildQuote(productId:string,product:CatalogItem,now:Date,selectedProvider:GiftDeliveryProvider,deliveryWindow:GiftDeliveryWindow,deliveryCity?:string,distanceEstimate?:number){
  const estimatedDistanceMiles=clamp(distanceEstimate??5,1,25);
  const distanceFeeCents=Math.max(0,Math.ceil(estimatedDistanceMiles-5)*85);
  const rushFeeCents=deliveryWindow==='asap'&&product.serviceLevel!=='scheduled'?299:0;
  const smallOrderFeeCents=product.amount<2500?199:0;
  const discountCents=product.amount>=6000?Math.min(499,product.deliveryFeeCents):0;
  const requestedDelay=deliveryWindow==='scheduled'?1440:deliveryWindow==='today'?90:0;
  const serviceDelay=Math.max(requestedDelay,now.getHours()>=product.cutoffHour?minutesUntilNextWindow(now,product.serviceLevel):0);
  const etaMinutesMin=serviceDelay+product.prepMinutes+product.travelMinutes;
  const etaMinutesMax=etaMinutesMin+product.windowBufferMinutes;
  const deliveryFeeCents=product.deliveryFeeCents+distanceFeeCents;
  const serviceFeeCents=Math.max(199,Math.round(product.amount*.065));
  const taxableCents=product.amount+deliveryFeeCents+rushFeeCents+smallOrderFeeCents+serviceFeeCents-discountCents;
  const estimatedTaxCents=Math.max(0,Math.round(taxableCents*.0875));
  const totalCents=taxableCents+estimatedTaxCents;
  return {
    quoteId:`quote-${crypto.randomUUID()}`,
    provider:selectedProvider,
    providerLabel:providerLabels[selectedProvider]??'Delivery partner',
    productId,
    productName:product.name,
    serviceLevel:product.serviceLevel,
    serviceLevelLabel:serviceLevelLabels[product.serviceLevel],
    itemSubtotalCents:product.amount,
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
    deliveryCity:deliveryCity?.trim()||'Recipient city',
    deliveryWindow,
    deliveryWindowLabel:deliveryWindow==='today'?'Later today':deliveryWindow==='scheduled'?'Scheduled delivery':'As soon as possible',
    estimatedDistanceMiles,
    exactRoutePending:true,
    etaMinutesMin,
    etaMinutesMax,
    etaLabel:formatEtaLabel(etaMinutesMin,etaMinutesMax,now),
    pickupPartnerName:product.pickupPartnerName,
    providerRecommendation:providerRecommendation(product.serviceLevel),
    providerCapability:selectedProvider==='demo_local'?'Preview partner; connect a city-capable courier adapter before launch.':'City-capable delivery partner selected by the DestinyOne backend.',
    paymentPolicy:'Sender is not charged until the recipient accepts privately and the provider confirms availability.',
    cancellationPolicy:'Free cancellation before recipient acceptance. Later refunds follow confirmed merchant and courier policy.',
    supportPolicy:'DestinyOne support can cancel, retry or refund from the internal order record.',
    acceptanceWindowMinutes:30,
    quoteValidMinutes:10,
    recipientPrivacy:'Recipient accepts privately. Address is never shown to the sender.',
    acceptanceExpiresAt:new Date(now.getTime()+30*60*1000).toISOString(),
    expiresAt:new Date(now.getTime()+10*60*1000).toISOString(),
  };
}

function buildConfirmations(demo:boolean){
  const status=demo?'preview_only':'queued';
  const detail=demo?'Connect the transactional email adapter before launch.':'Queued by DestinyOne for secure delivery.';
  return {
    emailAdapter:demo?'developer_required':'configured',
    senderReceiptLabel:'Gift request and price receipt',
    recipientRequestLabel:'Private gift acceptance request',
    channels:[
      {channel:'in_app',audience:'sender',label:'Your in-app receipt',status:'sent',detail:'The order record is available in Chat.'},
      {channel:'in_app',audience:'recipient',label:'Recipient in-app request',status,detail},
      {channel:'email',audience:'sender',label:'Sender email confirmation',status,detail},
      {channel:'email',audience:'recipient',label:'Recipient email request',status,detail},
    ],
  };
}

function providerRecommendation(serviceLevel:GiftServiceLevel){
  if(serviceLevel==='on_demand')return 'Use an on-demand courier partner for desserts, coffee and quick local surprises.';
  if(serviceLevel==='same_day')return 'Use a local merchant network with same-day courier pickup after recipient acceptance.';
  return 'Use scheduled fulfillment so fragile or customized gifts arrive in a clean delivery window.';
}

function buildSteps(status:GiftStatus,quote:ReturnType<typeof buildQuote>){
  const rank:Record<GiftStatus,number>={recipient_pending:1,recipient_accepted:2,payment_authorized:3,merchant_preparing:4,courier_assigned:4,picked_up:5,delivered:6,cancelled:0,failed:0};
  const current=rank[status]??1;
  const step=(position:number)=>status==='cancelled'||status==='failed'?'pending':current>position?'done':current===position?'active':'pending';
  return [
    {key:'request',label:'Gift request',body:'Sender chose the gift and note.',status:step(1)},
    {key:'recipient',label:'Private acceptance',body:'Recipient confirms delivery address privately.',status:step(2)},
    {key:'payment',label:'Secure payment',body:'Apple Pay / card is authorized after acceptance.',status:step(3)},
    {key:'partner',label:'Partner prepares',body:`${quote.pickupPartnerName} prepares the order.`,status:step(4),eta:quote.serviceLevel==='on_demand'?'15–30 min':'Same-day window'},
    {key:'delivery',label:'Courier delivery',body:`Estimated arrival ${quote.etaLabel}.`,status:step(5),eta:quote.etaLabel},
  ];
}

function minutesUntilNextWindow(now:Date,serviceLevel:GiftServiceLevel){
  const next=new Date(now);
  next.setDate(now.getDate()+1);
  next.setHours(serviceLevel==='on_demand'?10:11,0,0,0);
  return Math.max(0,Math.ceil((next.getTime()-now.getTime())/60000));
}

function formatEtaLabel(min:number,max:number,now:Date){
  if(max<180)return `${min}–${max} min`;
  const start=new Date(now.getTime()+min*60000);
  const end=new Date(now.getTime()+max*60000);
  const day=start.toDateString()===now.toDateString()?'Today':isTomorrow(start,now)?'Tomorrow':start.toLocaleDateString('en-US',{weekday:'short'});
  return `${day} ${formatTime(start)}–${formatTime(end)}`;
}

function formatTime(date:Date){
  return date.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
}

function isTomorrow(date:Date,now:Date){
  const tomorrow=new Date(now);
  tomorrow.setDate(now.getDate()+1);
  return date.toDateString()===tomorrow.toDateString();
}

function clamp(value:number,min:number,max:number){
  return Math.min(max,Math.max(min,value));
}

function json(payload:Record<string,unknown>,status=200){
  return new Response(JSON.stringify(payload),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
}
