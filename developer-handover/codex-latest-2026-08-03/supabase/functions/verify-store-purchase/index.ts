const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};
const json=(payload:Record<string,unknown>,status=200)=>new Response(JSON.stringify(payload),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
const bytesToHex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');
const sha256=async(value:string)=>bytesToHex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
const hmac=async(secret:string,value:string)=>bytesToHex(await crypto.subtle.sign('HMAC',await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']),new TextEncoder().encode(value)));
const allowedStatus=new Set(['verified','active','grace_period','billing_retry','expired','refunded','chargeback','revoked']);

type Input={
  purchaseSessionId?:string;
  restoreSessionId?:string;
  finalizeRestore?:boolean;
  verifiedCount?:number;
  restoreError?:string|null;
  platform?:'apple_iap'|'google_play';
  productId?:string;
  purchaseToken?:string;
  transactionId?:string|null;
};
type VerifiedEvent={
  verified?:boolean;
  platform?:string;
  eventId?:string;
  eventType?:string;
  productId?:string;
  transactionId?:string;
  originalTransactionId?:string|null;
  status?:string;
  amountCents?:number;
  currency?:string;
  environment?:'sandbox'|'production';
  verificationSource?:'apple_server_api'|'google_play_api';
  providerSignedAt?:string;
  purchasedAt?:string|null;
  expiresAt?:string|null;
  units?:number|null;
};

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const supabaseUrl=Deno.env.get('SUPABASE_URL');
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const verifierUrl=Deno.env.get('STORE_PURCHASE_VERIFIER_URL');
  const verifierSecret=Deno.env.get('STORE_PURCHASE_VERIFIER_SECRET');
  const bearer=req.headers.get('Authorization');
  if(!supabaseUrl||!serviceKey)return json({error:'Billing database is not configured'},503);
  if(!bearer)return json({error:'Authentication required'},401);

  const userResponse=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{apikey:serviceKey,Authorization:bearer}});
  const user=await userResponse.json().catch(()=>null) as {id?:string}|null;
  if(!userResponse.ok||!user?.id)return json({error:'Authentication required'},401);

  const input=await req.json().catch(()=>null) as Input|null;
  const adminHeaders={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json'};
  const getRows=async(path:string)=>{
    const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{headers:adminHeaders});
    if(!response.ok)throw new Error('billing_query_failed');
    return await response.json() as Record<string,unknown>[];
  };
  if(input?.finalizeRestore===true){
    if(!input.restoreSessionId||input.purchaseSessionId||!Number.isInteger(input.verifiedCount)||Number(input.verifiedCount)<0||Number(input.verifiedCount)>200||
      (input.restoreError!=null&&(typeof input.restoreError!=='string'||input.restoreError.length>160)))return json({error:'Invalid restore completion request'},400);
    try{
      const restores=await getRows(`billing_restore_sessions?id=eq.${encodeURIComponent(input.restoreSessionId)}&select=id,user_id,status,expires_at&limit=1`);
      const restore=restores[0];
      if(!restore||restore.user_id!==user.id||!['prepared','provider_syncing','verified','failed'].includes(String(restore.status)))return json({error:'Restore session is unavailable'},409);
      if(restore.status==='verified'&&input.restoreError==null)return json({completed:true,verifiedCount:input.verifiedCount});
      const response=await fetch(`${supabaseUrl}/rest/v1/rpc/complete_store_restore`,{method:'POST',headers:adminHeaders,body:JSON.stringify({
        p_restore_session_id:input.restoreSessionId,p_verified_count:input.verifiedCount,p_error:input.restoreError??null,
      })});
      if(!response.ok)return json({error:'Restore completion could not be recorded'},502);
      return json({completed:true,verifiedCount:input.verifiedCount});
    }catch{return json({error:'Restore completion is temporarily unavailable'},502)}
  }
  const oneOwner=Number(Boolean(input?.purchaseSessionId))+Number(Boolean(input?.restoreSessionId))===1;
  if(!input||!oneOwner||!['apple_iap','google_play'].includes(input.platform??'')||!input.productId||input.productId.length>180||!input.purchaseToken||input.purchaseToken.length<8||input.purchaseToken.length>12000){
    return json({error:'Invalid store verification request'},400);
  }
  const platform=input.platform!;

  try{
    let purchaseSessionId=input.purchaseSessionId??null;
    let restoreSessionId=input.restoreSessionId??null;
    let productKey='';
    if(purchaseSessionId){
      const sessions=await getRows(`billing_purchase_sessions?id=eq.${encodeURIComponent(purchaseSessionId)}&select=id,user_id,product_key,platform,status,expires_at&limit=1`);
      const session=sessions[0];
      if(!session||session.user_id!==user.id||session.platform!==platform||session.status!=='prepared'||Date.parse(String(session.expires_at))<=Date.now())return json({error:'Purchase session is unavailable'},409);
      productKey=String(session.product_key);
    }else{
      const restores=await getRows(`billing_restore_sessions?id=eq.${encodeURIComponent(restoreSessionId!)}&select=id,user_id,platform,status,expires_at&limit=1`);
      const restore=restores[0];
      if(!restore||restore.user_id!==user.id||restore.platform!==platform||!['prepared','provider_syncing'].includes(String(restore.status))||Date.parse(String(restore.expires_at))<=Date.now())return json({error:'Restore session is unavailable'},409);
    }

    const productFilter=productKey
      ?`product_key=eq.${encodeURIComponent(productKey)}`
      :`platform=eq.${platform}&external_product_id=eq.${encodeURIComponent(input.productId)}`;
    const products=await getRows(`billing_products?${productFilter}&active=eq.true&select=product_key,platform,external_product_id,product_class,units&limit=1`);
    const product=products[0];
    if(!product||product.platform!==platform||product.external_product_id!==input.productId)return json({error:'Verified store product is unavailable'},409);
    productKey=String(product.product_key);

    const tokenHash=await sha256(input.purchaseToken);
    const transactionHash=input.transactionId?await sha256(input.transactionId):null;
    const existing=await getRows(`billing_verification_attempts?platform=eq.${platform}&purchase_token_hash=eq.${tokenHash}&select=id,user_id,status,attempt_count&limit=1`);
    if(existing[0]&&existing[0].user_id!==user.id)return json({error:'Purchase token is already owned by another account'},409);
    const attemptId=existing[0]?.id??crypto.randomUUID();
    const attemptPayload={
      id:attemptId,user_id:user.id,purchase_session_id:purchaseSessionId,restore_session_id:restoreSessionId,
      platform,product_key:productKey,purchase_token_hash:tokenHash,transaction_hash:transactionHash,
      status:'pending',attempt_count:Math.min(20,Number(existing[0]?.attempt_count??0)+1),error_code:null,updated_at:new Date().toISOString(),
    };
    const attemptWrite=await fetch(`${supabaseUrl}/rest/v1/billing_verification_attempts?on_conflict=platform%2Cpurchase_token_hash`,{
      method:'POST',headers:{...adminHeaders,Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(attemptPayload),
    });
    if(!attemptWrite.ok)return json({error:'Could not prepare receipt verification'},502);

    const updateAttempt=async(status:string,errorCode:string|null,eventId?:string)=>fetch(`${supabaseUrl}/rest/v1/billing_verification_attempts?id=eq.${encodeURIComponent(String(attemptId))}`,{
      method:'PATCH',headers:{...adminHeaders,Prefer:'return=minimal'},body:JSON.stringify({status,error_code:errorCode,provider_event_id_hash:eventId?await sha256(eventId):null,verified_at:status==='verified'?new Date().toISOString():null,updated_at:new Date().toISOString()}),
    });

    if(!verifierUrl||!verifierSecret||!/^https:\/\//.test(verifierUrl)){
      await updateAttempt('provider_unavailable','verifier_not_configured');
      return json({error:'Store verification provider is not configured. No entitlement was changed.',code:'verifier_not_configured'},503);
    }

    const providerBody=JSON.stringify({
      platform,productId:input.productId,purchaseToken:input.purchaseToken,transactionId:input.transactionId??null,
      packageName:'com.destinyone.app',purchaseSessionId,restoreSessionId,accountId:user.id,
    });
    const providerResponse=await fetch(verifierUrl,{method:'POST',headers:{'Content-Type':'application/json','x-destinyone-signature':await hmac(verifierSecret,providerBody)},body:providerBody,signal:AbortSignal.timeout(15000)});
    const verified=await providerResponse.json().catch(()=>null) as VerifiedEvent|null;
    const valid=providerResponse.ok&&verified?.verified===true&&verified.platform===platform&&verified.productId===input.productId&&
      typeof verified.eventId==='string'&&typeof verified.eventType==='string'&&typeof verified.transactionId==='string'&&
      typeof verified.status==='string'&&allowedStatus.has(verified.status)&&Number.isInteger(verified.amountCents)&&Number(verified.amountCents)>=0&&
      typeof verified.currency==='string'&&/^[A-Za-z]{3}$/.test(verified.currency)&&['sandbox','production'].includes(verified.environment??'')&&
      verified.verificationSource===(platform==='apple_iap'?'apple_server_api':'google_play_api')&&typeof verified.providerSignedAt==='string';
    if(!valid){
      await updateAttempt('rejected',providerResponse.ok?'invalid_provider_response':'provider_rejected');
      return json({error:'The app store could not verify this purchase. No entitlement was changed.',code:'receipt_rejected'},422);
    }

    if(!purchaseSessionId){
      purchaseSessionId=crypto.randomUUID();
      const createSession=await fetch(`${supabaseUrl}/rest/v1/billing_purchase_sessions`,{method:'POST',headers:{...adminHeaders,Prefer:'return=minimal'},body:JSON.stringify({
        id:purchaseSessionId,user_id:user.id,product_key:productKey,platform,status:'prepared',idempotency_key:`restore:${restoreSessionId}:${tokenHash.slice(0,24)}`,
      })});
      if(!createSession.ok){await updateAttempt('ledger_failed','restore_binding_failed',verified.eventId);return json({error:'Verified restore could not be bound to this account'},502)}
    }

    const ledgerResponse=await fetch(`${supabaseUrl}/rest/v1/rpc/process_billing_webhook`,{method:'POST',headers:adminHeaders,body:JSON.stringify({
      p_platform:platform,p_external_event_id:verified.eventId,p_event_type:verified.eventType,p_payload_sha256:await sha256(JSON.stringify(verified)),
      p_purchase_session_id:purchaseSessionId,p_external_product_id:verified.productId,p_transaction_hash:await sha256(verified.transactionId),
      p_original_transaction_hash:verified.originalTransactionId?await sha256(verified.originalTransactionId):null,p_status:verified.status,
      p_amount_cents:verified.amountCents,p_currency:verified.currency!.toLowerCase(),p_environment:verified.environment,
      p_verification_source:verified.verificationSource,p_provider_signed_at:verified.providerSignedAt,p_purchased_at:verified.purchasedAt??null,
      p_expires_at:verified.expiresAt??null,p_units:verified.units??Number(product.units),
    })});
    const processed=await ledgerResponse.json().catch(()=>false);
    if(!ledgerResponse.ok||processed!==true){await updateAttempt('ledger_failed','ledger_rejected',verified.eventId);return json({error:'Purchase was verified but entitlement processing needs support review'},502)}
    await updateAttempt('verified',null,verified.eventId);
    const entitlements=await getRows(`billing_entitlement_snapshots?user_id=eq.${encodeURIComponent(user.id)}&status=in.(active,grace_period,billing_retry)&select=entitlement_key,status,units,expires_at&order=entitlement_key`);
    return json({verified:true,finishedTransactionAllowed:true,entitlements:entitlements.map(item=>({key:item.entitlement_key,status:item.status,units:item.units,expiresAt:item.expires_at}))});
  }catch(error){
    console.error('Store verification failed',error instanceof Error?error.message:'unknown');
    return json({error:'Secure store verification is temporarily unavailable. No entitlement was changed.'},502);
  }
});
