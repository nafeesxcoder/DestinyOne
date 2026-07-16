const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};

type GiftDeliveryProvider='demo_local'|'doordash_drive'|'uber_direct';
type GiftServiceLevel='on_demand'|'same_day'|'scheduled';
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
  'ruby-roses':{name:'Ruby Rose Bouquet',amount:4900,serviceLevel:'same_day',prepMinutes:35,travelMinutes:45,windowBufferMinutes:45,deliveryFeeCents:899,cutoffHour:20,pickupPartnerName:'Premium florist network'},
  'gelato-night':{name:'Gelato Night',amount:2600,serviceLevel:'on_demand',prepMinutes:15,travelMinutes:28,windowBufferMinutes:24,deliveryFeeCents:699,cutoffHour:22,pickupPartnerName:'Local dessert partner'},
  'chai-duo':{name:'Chai & Coffee Duo',amount:2200,serviceLevel:'on_demand',prepMinutes:12,travelMinutes:30,windowBufferMinutes:25,deliveryFeeCents:599,cutoffHour:21,pickupPartnerName:'Cafe partner'},
  'artisan-chocolate':{name:'Artisan Chocolates',amount:3600,serviceLevel:'same_day',prepMinutes:25,travelMinutes:40,windowBufferMinutes:40,deliveryFeeCents:799,cutoffHour:20,pickupPartnerName:'Chocolate boutique'},
  'mini-cake':{name:'Celebration Cake',amount:4200,serviceLevel:'scheduled',prepMinutes:180,travelMinutes:1440,windowBufferMinutes:360,deliveryFeeCents:899,cutoffHour:17,pickupPartnerName:'Bakery partner'},
  orchid:{name:'Mini Orchid',amount:3900,serviceLevel:'scheduled',prepMinutes:120,travelMinutes:1440,windowBufferMinutes:360,deliveryFeeCents:799,cutoffHour:18,pickupPartnerName:'Plant studio'},
  'book-date':{name:'Bookstore Surprise',amount:3200,serviceLevel:'scheduled',prepMinutes:90,travelMinutes:1440,windowBufferMinutes:360,deliveryFeeCents:699,cutoffHour:18,pickupPartnerName:'Bookstore partner'},
  'self-care':{name:'Self-care Box',amount:5800,serviceLevel:'scheduled',prepMinutes:120,travelMinutes:1440,windowBufferMinutes:360,deliveryFeeCents:799,cutoffHour:18,pickupPartnerName:'Wellness gift partner'},
  candle:{name:'Velvet Candle',amount:3400,serviceLevel:'same_day',prepMinutes:25,travelMinutes:38,windowBufferMinutes:42,deliveryFeeCents:699,cutoffHour:20,pickupPartnerName:'Home fragrance partner'},
  fruit:{name:'Fresh Fruit Basket',amount:4500,serviceLevel:'same_day',prepMinutes:30,travelMinutes:42,windowBufferMinutes:44,deliveryFeeCents:799,cutoffHour:19,pickupPartnerName:'Fresh market partner'},
  card:{name:'Handwritten Card',amount:1800,serviceLevel:'scheduled',prepMinutes:45,travelMinutes:1440,windowBufferMinutes:360,deliveryFeeCents:499,cutoffHour:17,pickupPartnerName:'Stationery partner'},
  'movie-night':{name:'Movie Night Kit',amount:4400,serviceLevel:'same_day',prepMinutes:28,travelMinutes:40,windowBufferMinutes:35,deliveryFeeCents:799,cutoffHour:21,pickupPartnerName:'Snack partner'},
};

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(!req.headers.get('Authorization'))return json({error:'Authentication required'},401);
  try{
    const {productId,recipientId,note}=await req.json() as {productId?:string;recipientId?:string;note?:string};
    const product=productId?catalog[productId]:undefined;
    if(!product||!recipientId)return json({error:'Unknown product or recipient'},400);
    if(note&&note.length>160)return json({error:'Gift note is too long'},400);

    const quote=buildQuote(productId!,product,new Date(),provider);
    const orderId=`gift-${crypto.randomUUID()}`;
    const trackingUrl=`https://destinyone.app/gifts/${orderId}`;

    // Production flow:
    // 1) Insert gift_order with recipient_pending.
    // 2) Notify recipient to accept and enter/confirm address privately.
    // 3) After acceptance, authorize payment for quote.totalCents.
    // 4) Submit delivery to DoorDash Drive or Uber Direct using server secrets.
    // 5) Webhooks update gift_order_events and chat metadata.
    //
    // DoorDash Drive supports creating delivery quotes and accepting them to
    // create a delivery. Uber Direct supports courier delivery requests for
    // merchant apps. Both should be called only after recipient consent.
    console.info('Gift request created',{orderId,productId,recipientId,noteLength:note?.length??0,provider,amount:product.amount,total:quote.totalCents});

    return json({
      orderId,
      demo:provider==='demo_local',
      status:'recipient_pending',
      deliveryStatus:'recipient_pending',
      provider,
      trackingUrl,
      quote,
      steps:buildSteps('recipient_pending',quote),
    });
  }catch(error){
    console.error('Gift order error',error);
    return json({error:'Invalid gift request'},400);
  }
});

function buildQuote(productId:string,product:CatalogItem,now:Date,selectedProvider:GiftDeliveryProvider){
  const serviceDelay=now.getHours()>=product.cutoffHour?minutesUntilNextWindow(now,product.serviceLevel):0;
  const etaMinutesMin=serviceDelay+product.prepMinutes+product.travelMinutes;
  const etaMinutesMax=etaMinutesMin+product.windowBufferMinutes;
  const serviceFeeCents=Math.max(199,Math.round(product.amount*.08));
  const estimatedTaxCents=Math.round((product.amount+product.deliveryFeeCents+serviceFeeCents)*.0875);
  const totalCents=product.amount+product.deliveryFeeCents+serviceFeeCents+estimatedTaxCents;
  return {
    quoteId:`quote-${crypto.randomUUID()}`,
    provider:selectedProvider,
    providerLabel:providerLabels[selectedProvider]??'Delivery partner',
    productId,
    productName:product.name,
    serviceLevel:product.serviceLevel,
    serviceLevelLabel:serviceLevelLabels[product.serviceLevel],
    itemSubtotalCents:product.amount,
    deliveryFeeCents:product.deliveryFeeCents,
    serviceFeeCents,
    estimatedTaxCents,
    totalCents,
    etaMinutesMin,
    etaMinutesMax,
    etaLabel:formatEtaLabel(etaMinutesMin,etaMinutesMax,now),
    pickupPartnerName:product.pickupPartnerName,
    providerRecommendation:providerRecommendation(product.serviceLevel),
    paymentPolicy:'Sender is not charged until the recipient accepts privately and the provider confirms availability.',
    acceptanceWindowMinutes:30,
    recipientPrivacy:'Recipient accepts privately. Address is never shown to the sender.',
    expiresAt:new Date(now.getTime()+10*60*1000).toISOString(),
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

function json(payload:Record<string,unknown>,status=200){
  return new Response(JSON.stringify(payload),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
}
