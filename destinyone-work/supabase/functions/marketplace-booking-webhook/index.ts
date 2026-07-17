const json=(payload:Record<string,unknown>,status=200)=>new Response(JSON.stringify(payload),{status,headers:{'Content-Type':'application/json'}});
const hex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');
const same=(left:string,right:string)=>{if(left.length!==right.length)return false;let mismatch=0;for(let index=0;index<left.length;index++)mismatch|=left.charCodeAt(index)^right.charCodeAt(index);return mismatch===0};

Deno.serve(async(req)=>{
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const secret=Deno.env.get('MARKETPLACE_WEBHOOK_SECRET');
  const supabaseUrl=Deno.env.get('SUPABASE_URL');
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const signature=req.headers.get('x-destinyone-signature');
  const raw=await req.text();
  if(!secret||!supabaseUrl||!serviceKey)return json({error:'Webhook is not configured'},503);
  const expected=hex(await crypto.subtle.sign('HMAC',await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']),new TextEncoder().encode(raw)));
  if(!signature||!same(signature,expected))return json({error:'Invalid signature'},401);
  const event=JSON.parse(raw) as {provider?:string;eventId?:string;orderId?:string;type?:string;amountCents?:number;currency?:string;paymentIntentId?:string;providerConfirmation?:string};
  if(!event.provider||!event.eventId||!event.orderId||!event.type||typeof event.amountCents!=='number'||!Number.isInteger(event.amountCents)||event.amountCents<0||!event.currency)return json({error:'Invalid event'},400);
  const payloadHash=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)));
  const response=await fetch(`${supabaseUrl}/rest/v1/rpc/process_marketplace_booking_webhook`,{method:'POST',headers:{Authorization:`Bearer ${serviceKey}`,apikey:serviceKey,'Content-Type':'application/json'},body:JSON.stringify({p_provider:event.provider,p_provider_event_id:event.eventId,p_order_id:event.orderId,p_event_type:event.type,p_amount_cents:event.amountCents,p_currency:event.currency,p_payload_hash:payloadHash,p_payment_intent_id:event.paymentIntentId??null,p_provider_confirmation:event.providerConfirmation??null})});
  if(!response.ok)return json({error:'Webhook processing failed'},502);
  return json({received:true,processed:await response.json()});
});
