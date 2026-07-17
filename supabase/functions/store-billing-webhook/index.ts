const json=(payload:Record<string,unknown>,status=200)=>new Response(JSON.stringify(payload),{status,headers:{'Content-Type':'application/json'}});
const hex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');
const same=(left:string,right:string)=>{if(left.length!==right.length)return false;let mismatch=0;for(let index=0;index<left.length;index++)mismatch|=left.charCodeAt(index)^right.charCodeAt(index);return mismatch===0};
const sha256=async(value:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));

Deno.serve(async(req)=>{
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const secret=Deno.env.get('STORE_BILLING_WEBHOOK_SECRET');
  const supabaseUrl=Deno.env.get('SUPABASE_URL');
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const signature=req.headers.get('x-destinyone-signature');
  const raw=await req.text();
  if(!secret||!supabaseUrl||!serviceKey)return json({error:'Store billing webhook is not configured'},503);
  const expected=hex(await crypto.subtle.sign('HMAC',await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']),new TextEncoder().encode(raw)));
  if(!signature||!same(signature,expected))return json({error:'Invalid signature'},401);
  const event=JSON.parse(raw) as {platform?:string;eventId?:string;type?:string;purchaseSessionId?:string;transactionId?:string;originalTransactionId?:string;status?:string;purchasedAt?:string;expiresAt?:string;units?:number};
  if(!event.platform||!event.eventId||!event.type||!event.purchaseSessionId||!event.transactionId||!event.status)return json({error:'Invalid event'},400);
  const response=await fetch(`${supabaseUrl}/rest/v1/rpc/process_billing_webhook`,{method:'POST',headers:{Authorization:`Bearer ${serviceKey}`,apikey:serviceKey,'Content-Type':'application/json'},body:JSON.stringify({p_platform:event.platform,p_external_event_id:event.eventId,p_event_type:event.type,p_payload_sha256:await sha256(raw),p_purchase_session_id:event.purchaseSessionId,p_transaction_hash:await sha256(event.transactionId),p_original_transaction_hash:event.originalTransactionId?await sha256(event.originalTransactionId):null,p_status:event.status,p_purchased_at:event.purchasedAt??null,p_expires_at:event.expiresAt??null,p_units:event.units??1})});
  if(!response.ok)return json({error:'Billing event processing failed'},502);
  const processed=await response.json();
  if(processed!==true)return json({error:'Billing event rejected for retry'},502);
  return json({received:true,processed:true});
});
