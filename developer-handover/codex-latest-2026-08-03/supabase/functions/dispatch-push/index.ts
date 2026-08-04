const jsonHeaders={'Content-Type':'application/json'};

Deno.serve(async(req)=>{
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const secret=Deno.env.get('PUSH_DISPATCH_SECRET');
  if(!secret||req.headers.get('x-push-secret')!==secret)return json({error:'Unauthorized'},401);
  const supabaseUrl=Deno.env.get('SUPABASE_URL');
  const serviceRoleKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!supabaseUrl||!serviceRoleKey)return json({error:'Push worker is not configured'},503);
  const input=await req.json().catch(()=>({})) as {notificationId?:string;record?:{id?:string}};
  const notificationId=input.notificationId??input.record?.id;
  if(!notificationId)return json({error:'notificationId or webhook record.id is required'},400);
  const headers={apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`};
  const notificationResponse=await fetch(`${supabaseUrl}/rest/v1/member_notifications?id=eq.${encodeURIComponent(notificationId)}&select=id,user_id,type,title,body,metadata&limit=1`,{headers});
  const notifications=await notificationResponse.json().catch(()=>[]);
  const notification=notifications[0];
  if(!notification)return json({error:'Notification not found'},404);
  const tokenResponse=await fetch(`${supabaseUrl}/rest/v1/push_tokens?user_id=eq.${notification.user_id}&revoked_at=is.null&select=id,token,platform`,{headers});
  const tokens=await tokenResponse.json().catch(()=>[]);
  const expoTokens=tokens.filter((item:{token?:string})=>/^Expo(nent)?PushToken\[/.test(item.token??''));
  if(!expoTokens.length)return json({attempted:0,sent:0,failed:0});
  const messages=expoTokens.map((item:{token:string})=>({
    to:item.token,sound:'default',channelId:notification.type==='message'?'messages':'default',priority:'high',
    title:notification.title,body:notification.body||'Open DestinyOne for a private update.',
    data:{notificationId:notification.id,type:notification.type,...(notification.metadata||{})},
  }));
  const pushResponse=await fetch('https://exp.host/--/api/v2/push/send',{
    method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...(Deno.env.get('EXPO_PUSH_ACCESS_TOKEN')?{Authorization:`Bearer ${Deno.env.get('EXPO_PUSH_ACCESS_TOKEN')}`}:{})},
    body:JSON.stringify(messages),
  });
  const pushBody=await pushResponse.json().catch(()=>null);
  if(!pushResponse.ok)return json({error:'Expo Push Service rejected the request',details:pushBody},502);
  const receipts=Array.isArray(pushBody?.data)?pushBody.data:[pushBody?.data];
  await Promise.all(receipts.map(async(item:{status?:string;details?:{error?:string}},index:number)=>{
    if(item?.details?.error!=='DeviceNotRegistered'||!expoTokens[index]?.id)return;
    await fetch(`${supabaseUrl}/rest/v1/push_tokens?id=eq.${encodeURIComponent(expoTokens[index].id)}`,{
      method:'PATCH',headers:{...headers,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify({revoked_at:new Date().toISOString(),updated_at:new Date().toISOString()}),
    });
  }));
  return json({attempted:messages.length,sent:receipts.filter((item:{status?:string})=>item?.status==='ok').length,failed:receipts.filter((item:{status?:string})=>item?.status==='error').length,receipts});
});

function json(payload:Record<string,unknown>,status=200){return new Response(JSON.stringify(payload),{status,headers:jsonHeaders})}
