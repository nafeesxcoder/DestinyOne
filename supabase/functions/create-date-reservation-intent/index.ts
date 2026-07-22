const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const authorization=req.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return json({error:'Authentication required'},401);

  const stripeSecret=Deno.env.get('STRIPE_SECRET_KEY');
  const supabaseUrl=Deno.env.get('SUPABASE_URL');
  const anonKey=Deno.env.get('SUPABASE_ANON_KEY');
  if(!stripeSecret||!supabaseUrl||!anonKey)return json({error:'Payment service is not configured'},503);

  try{
    const {orderId}=await req.json() as {orderId?:string};
    if(!orderId)return json({error:'Order is required'},400);

    const authResponse=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{Authorization:authorization,apikey:anonKey}});
    if(!authResponse.ok)return json({error:'Authentication required'},401);

    const prepareResponse=await fetch(`${supabaseUrl}/rest/v1/rpc/prepare_marketplace_payment`,{
      method:'POST',headers:{Authorization:authorization,apikey:anonKey,'Content-Type':'application/json'},body:JSON.stringify({p_order_id:orderId}),
    });
    if(!prepareResponse.ok)return json({error:'Booking is not ready for payment'},409);
    const prepared=await prepareResponse.json() as {orderId?:string;amountCents?:number;currency?:'usd'|'cad'};
    if(prepared.orderId!==orderId||!prepared.amountCents||!prepared.currency)return json({error:'Invalid server-owned order total'},409);

    const body=new URLSearchParams({
      amount:String(prepared.amountCents),
      currency:prepared.currency,
      'automatic_payment_methods[enabled]':'true',
      'metadata[marketplace_order_id]':orderId,
      'metadata[purpose]':'date_reservation_hold',
      description:'DestinyOne refundable date venue reservation hold',
    });
    const stripeResponse=await fetch('https://api.stripe.com/v1/payment_intents',{
      method:'POST',
      headers:{Authorization:`Bearer ${stripeSecret}`,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':`destinyone-date-${orderId}`},
      body:body.toString(),
    });
    const paymentIntent=await stripeResponse.json() as {id?:string;client_secret?:string;error?:{message?:string}};
    if(!stripeResponse.ok||!paymentIntent.id||!paymentIntent.client_secret){
      console.error('Stripe intent error',paymentIntent.error?.message??'unknown error');
      return json({error:'Could not prepare secure checkout'},502);
    }
    return json({reservationId:paymentIntent.id,clientSecret:paymentIntent.client_secret,orderId});
  }catch(error){
    console.error('Reservation payment error',error);
    return json({error:'Invalid payment request'},400);
  }
});

function json(payload:Record<string,unknown>,status=200){
  return new Response(JSON.stringify(payload),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
}
