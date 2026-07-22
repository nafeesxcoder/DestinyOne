const jsonHeaders={'Content-Type':'application/json'};

Deno.serve(async(req)=>{
  if(req.method!=='POST')return json({error:'Method not allowed'},405);

  const cronSecret=Deno.env.get('RELATIONSHIP_REMINDER_CRON_SECRET');
  if(!cronSecret||req.headers.get('x-cron-secret')!==cronSecret)return json({error:'Unauthorized'},401);

  const supabaseUrl=Deno.env.get('SUPABASE_URL');
  const serviceRoleKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!supabaseUrl||!serviceRoleKey)return json({error:'Reminder worker is not configured'},503);

  const response=await fetch(`${supabaseUrl}/rest/v1/rpc/process_relationship_reminders`,{
    method:'POST',
    headers:{...jsonHeaders,apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`},
    body:JSON.stringify({p_limit:100}),
  });
  const body=await response.text();
  if(!response.ok){console.error('Relationship reminder processing failed',body);return json({error:'Reminder processing failed'},502)}
  return json({processed:Number(body)||0});
});

function json(payload:Record<string,unknown>,status=200){
  return new Response(JSON.stringify(payload),{status,headers:jsonHeaders});
}
