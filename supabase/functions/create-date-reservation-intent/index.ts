const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};

const supportedVenues=new Set([
  'cafe-1','cafe-2','walk-1','walk-2','dinner-1','dinner-2','activity-1','activity-2',
]);

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(!req.headers.get('Authorization'))return json({error:'Authentication required'},401);

  const stripeSecret=Deno.env.get('STRIPE_SECRET_KEY');
  if(!stripeSecret)return json({error:'Payment service is not configured'},503);

  try{
    const {venueId}=await req.json() as {venueId?:string};
    if(!venueId||!supportedVenues.has(venueId))return json({error:'Unknown venue'},400);

    // Amounts are owned by the server. Never accept a price from the app.
    const body=new URLSearchParams({
      amount:'1000',
      currency:'usd',
      'automatic_payment_methods[enabled]':'true',
      'metadata[venue_id]':venueId,
      'metadata[purpose]':'date_reservation_hold',
      description:'DestinyOne refundable date venue reservation hold',
    });
    const stripeResponse=await fetch('https://api.stripe.com/v1/payment_intents',{
      method:'POST',
      headers:{Authorization:`Bearer ${stripeSecret}`,'Content-Type':'application/x-www-form-urlencoded'},
      body:body.toString(),
    });
    const paymentIntent=await stripeResponse.json() as {id?:string;client_secret?:string;error?:{message?:string}};
    if(!stripeResponse.ok||!paymentIntent.id||!paymentIntent.client_secret){
      console.error('Stripe intent error',paymentIntent.error?.message??'unknown error');
      return json({error:'Could not prepare secure checkout'},502);
    }
    return json({reservationId:paymentIntent.id,clientSecret:paymentIntent.client_secret});
  }catch(error){
    console.error('Reservation payment error',error);
    return json({error:'Invalid payment request'},400);
  }
});

function json(payload:Record<string,unknown>,status=200){
  return new Response(JSON.stringify(payload),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
}
