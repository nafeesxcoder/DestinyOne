begin;

create extension if not exists pgtap with schema extensions;
select plan(184);

select has_function('public','get_backend_deployment_manifest',array[]::text[],'read-only deployment manifest exists');
select function_privs_are('public','get_backend_deployment_manifest',array[]::text[],'service_role',array['EXECUTE'],'deployment manifest is service-role only');
select ok(not has_function_privilege('anon','public.get_backend_deployment_manifest()','EXECUTE'),'anonymous users cannot inspect the deployment manifest');
select ok(not has_function_privilege('authenticated','public.get_backend_deployment_manifest()','EXECUTE'),'members cannot inspect the deployment manifest');
select ok(public.get_backend_deployment_manifest() ? 'anonymous_table_exposures','deployment manifest reports anonymous table policy exposure');
select ok(public.get_backend_deployment_manifest() ? 'anonymous_rpc_exposures','deployment manifest reports anonymous function grants');

select has_table('public','matching_evaluation_runs','matching promotion evidence is stored server-side');
select has_column('public','matching_model_guardrails','minimum_precision_at_5','matching guardrails include offline precision');
select has_column('public','matching_model_guardrails','minimum_eligible_coverage_rate','matching guardrails include eligible coverage');
select has_column('public','matching_model_guardrails','minimum_safety_exclusion_recall','matching guardrails require safety exclusion recall');
select has_function('public','record_matching_evaluation',array['text','text','text','integer','jsonb','text','text'],'aggregate matching evaluation RPC exists');
select function_privs_are('public','record_matching_evaluation',array['text','text','text','integer','jsonb','text','text'],'service_role',array['EXECUTE'],'matching evaluation recording is service-only');
select table_privs_are('public','matching_evaluation_runs','authenticated',array[]::text[],'members cannot read or forge model evaluation evidence');

select has_table('public','trust_ops_reviewers','private reviewer registry exists');
select has_table('public','moderation_cases','authoritative moderation cases exist');
select has_table('public','moderation_case_events','append-only moderation event timeline exists');
select has_table('public','member_enforcement_states','bounded member enforcement state exists');
select has_table('public','moderation_appeals','member appeal lifecycle exists');
select has_function('public','apply_moderation_action',array['uuid','text','uuid','text','text','jsonb'],'reviewer moderation action RPC exists');
select has_function('public','submit_moderation_appeal',array['uuid','text','text'],'member appeal RPC exists');
select has_function('public','resolve_moderation_appeal',array['uuid','text','uuid','text','text'],'appeal decision RPC exists');
select function_privs_are('public','apply_moderation_action',array['uuid','text','uuid','text','text','jsonb'],'service_role',array['EXECUTE'],'moderation actions are service-only');
select function_privs_are('public','submit_moderation_appeal',array['uuid','text','text'],'authenticated',array['EXECUTE'],'members can submit only their own eligible appeal');
select function_privs_are('public','resolve_moderation_appeal',array['uuid','text','uuid','text','text'],'service_role',array['EXECUTE'],'appeal decisions are service-only');
select table_privs_are('public','moderation_cases','authenticated',array[]::text[],'members cannot inspect moderation cases');
select table_privs_are('public','moderation_case_events','authenticated',array[]::text[],'members cannot inspect reviewer notes or evidence events');
select table_privs_are('public','moderation_appeals','authenticated',array[]::text[],'appeals mutate only through the bounded RPC');
select has_trigger('public','reports','reports_create_moderation_case','reports automatically create Trust Ops cases');

select has_table('public','billing_products','server-owned billing catalog exists');
select has_table('public','billing_purchase_sessions','server-bound store purchase sessions exist');
select has_table('public','billing_purchase_receipts','hashed provider receipts exist');
select has_table('public','billing_entitlement_ledger','immutable entitlement ledger exists');
select has_table('public','billing_entitlement_snapshots','current entitlement snapshots exist');
select has_table('public','billing_webhook_receipts','idempotent billing webhook receipts exist');
select has_table('public','billing_refund_cases','billing refund support cases exist');
select has_table('public','billing_daily_finance_snapshots','unit economics snapshots exist');
select has_table('public','golden_spark_sends','server-owned Golden Spark sends exist');
select has_function('public','get_current_entitlements',array[]::text[],'safe entitlement RPC exists');
select has_function('public','restore_store_purchases',array[]::text[],'server-verified restore RPC exists');
select has_function('public','request_billing_refund',array['uuid','text','text'],'idempotent refund request RPC exists');
select has_function('public','prepare_store_purchase',array['text','text','text'],'rate-limited store preparation RPC exists');
select has_function('public','consume_billing_entitlement',array['text','integer','text'],'idempotent Spark consumption RPC exists');
select has_function('public','send_golden_spark',array['uuid','text','text'],'atomic Golden Spark RPC exists');
select function_privs_are('public','billing_status_transition_allowed',array['text','text'],'service_role',array['EXECUTE'],'billing transition guard is service-only');
select function_privs_are('public','process_billing_webhook',array['text','text','text','text','uuid','text','text','text','timestamp with time zone','timestamp with time zone','integer'],'service_role',array['EXECUTE'],'billing processor is service-only');
select table_privs_are('public','billing_purchase_receipts','authenticated',array[]::text[],'members cannot query raw purchase receipts');
select table_privs_are('public','billing_entitlement_ledger','authenticated',array[]::text[],'members cannot mutate or query the raw ledger');
select table_privs_are('public','billing_webhook_receipts','authenticated',array[]::text[],'members cannot read provider webhook payload hashes');
select table_privs_are('public','billing_daily_finance_snapshots','authenticated',array[]::text[],'members cannot read finance operations');
select ok(not has_table_privilege('authenticated','public.billing_entitlement_snapshots','INSERT'),'members cannot self-grant entitlements');
select ok(not has_table_privilege('authenticated','public.golden_spark_sends','INSERT'),'members cannot bypass Spark allowance or wallet debit');

select has_table('public','growth_attribution_touches','private attribution touches exist');
select has_table('public','growth_events','consented funnel events exist');
select has_table('public','growth_experiments','controlled experiment registry exists');
select has_table('public','growth_experiment_assignments','stable experiment assignments exist');
select has_table('public','growth_referral_conversions','verified referral conversion lifecycle exists');
select has_table('public','growth_reward_ledger','idempotent reward ledger exists');
select has_table('public','growth_daily_cohort_snapshots','service-only growth cohort snapshots exist');
select has_function('public','record_growth_event',array['uuid','uuid','text','jsonb'],'consent-gated growth event RPC exists');
select has_function('public','record_growth_attribution_touch',array['uuid','text','text','text'],'consent-gated attribution RPC exists');
select has_function('public','redeem_growth_referral',array['text','text'],'referral redemption RPC exists');
select has_function('public','assign_growth_experiment',array['text'],'stable experiment assignment RPC exists');
select function_privs_are('public','process_growth_referral_reward',array['uuid','text'],'service_role',array['EXECUTE'],'referral reward processor is service-only');
select table_privs_are('public','growth_daily_cohort_snapshots','authenticated',array[]::text[],'members cannot read aggregate operations snapshots directly');
select table_privs_are('public','growth_events','authenticated',array[]::text[],'members cannot query raw growth events directly');

select has_table('public','marketplace_partners','marketplace partners are modeled privately');
select has_table('public','marketplace_venues','marketplace venues are modeled privately');
select has_table('public','marketplace_offerings','server-owned offerings exist');
select has_table('public','marketplace_availability_slots','fresh availability slots exist');
select has_table('public','marketplace_reservation_quotes','immutable member quotes exist');
select has_table('public','marketplace_reservation_orders','reservation orders exist');
select has_table('public','marketplace_reservation_events','append-only booking events exist');
select has_table('public','marketplace_provider_webhook_receipts','idempotent webhook receipts exist');
select has_function('public','create_marketplace_quote',array['uuid','uuid','integer','text'],'secure quote RPC exists');
select has_function('public','prepare_marketplace_payment',array['uuid'],'server-owned payment preparation RPC exists');
select has_function('public','cancel_marketplace_reservation_order',array['uuid','text','text'],'cancellation RPC exists');
select function_privs_are('public','process_marketplace_booking_webhook',array['text','text','uuid','text','text','text'],'service_role',array['EXECUTE'],'provider webhook processor is service-only');

select has_function('public', 'get_current_member_bootstrap', array[]::text[], 'member bootstrap RPC exists');
select has_function('public', 'block_member', array['uuid'], 'server-owned block RPC exists');
select has_function('public', 'is_blocked_pair', array['uuid','uuid'], 'blocked-pair helper exists');
select has_function(
  'public',
  'send_match_message',
  array['uuid','text','message_kind','text','text','jsonb'],
  'server-owned message RPC exists'
);
select has_function('public','save_matching_preferences',array['jsonb','jsonb'],'validated matching-preference RPC exists');
select has_function('public','record_discovery_signal',array['uuid','text','text'],'server-owned discovery signal RPC exists');
select has_function('public','submit_match_feedback',array['uuid','text','boolean','text'],'consented match-feedback RPC exists');
select has_function('public','get_matching_pool_status',array[]::text[],'safe matching pool status RPC exists');
select has_function('public','rollback_matching_model',array['text','text','text'],'audited model rollback RPC exists');
select has_table('public','matching_model_guardrails','model health guardrails exist');
select function_privs_are('public','get_matching_pool_status',array[]::text[],'authenticated',array['EXECUTE'],'members can read only their own pool status');
select function_privs_are('public','rollback_matching_model',array['text','text','text'],'service_role',array['EXECUTE'],'model rollback is service-only');
select ok(not has_function_privilege('authenticated','public.rank_matching_candidates(uuid)','EXECUTE'),'members cannot probe internal candidate scores');
select table_privs_are('public','matching_model_guardrails','authenticated',array[]::text[],'members cannot read model operations thresholds');
select has_function('public','clear_matching_learning',array[]::text[],'matching-learning reset RPC exists');
select has_table('public','profile_match_attributes','private reciprocal match attributes exist');
select has_table('public','matching_preferences','private detailed matching preferences exist');
select has_table('public','daily_match_recommendations','versioned recommendation impressions exist');
select has_table('public','match_feedback','private outcome feedback exists');
select has_function('public','join_city_waitlist',array['text','text','text','text','text'],'validated city waitlist RPC exists');
select has_function('public','create_city_referral',array['text'],'rate-limited city referral RPC exists');
select has_function('public','apply_city_ambassador',array['text','text','text','boolean'],'verified ambassador application RPC exists');
select has_table('public','city_launch_markets','controlled launch markets exist');
select has_table('public','city_waitlist_entries','private city waitlist entries exist');
select has_table('public','city_referral_invites','auditable referral invites exist');
select has_table('public','city_ambassador_applications','reviewed ambassador applications exist');
select has_table('public','city_liquidity_snapshots','weekly city liquidity snapshots exist');
select has_table('public','city_cohort_snapshots','privacy-suppressed cohort snapshots exist');
select ok(
  not has_table_privilege('authenticated','public.city_liquidity_snapshots','SELECT'),
  'members cannot read operational city liquidity metrics'
);
select ok(
  not has_table_privilege('authenticated','public.city_cohort_snapshots','SELECT'),
  'members cannot read sensitive cohort metrics'
);
select ok(
  not has_table_privilege('authenticated','public.discovery_signals','INSERT'),
  'authenticated clients cannot forge discovery learning rows directly'
);
select ok(
  not has_column_privilege('authenticated','public.daily_match_recommendations','score_internal','SELECT'),
  'members cannot read internal recommendation scores'
);
select ok(
  not has_function_privilege('authenticated','public.matching_candidate_eligible(uuid,uuid)','EXECUTE'),
  'candidate eligibility helper is not a profile-probing endpoint'
);
select has_function(
  'public',
  'save_current_member_profile',
  array['jsonb','jsonb','text[]'],
  'server-owned member profile RPC exists'
);
select has_function('public', 'submit_member_report', array['uuid','text','text','text'], 'server-owned report RPC exists');
select has_function('public', 'unmatch_member', array['uuid','text'], 'server-owned unmatch RPC exists');
select has_function(
  'public',
  'start_live_location_share',
  array['uuid','text','numeric','numeric','integer','integer'],
  'server-owned live-location RPC exists'
);
select has_table('public', 'safety_action_events', 'append-only safety audit table exists');
select ok(
  not has_table_privilege('authenticated', 'public.reports', 'INSERT'),
  'authenticated clients cannot insert reports directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.live_location_shares', 'INSERT'),
  'authenticated clients cannot insert live-location rows directly'
);
select ok(
  not exists(select 1 from pg_policies where schemaname='public' and tablename='live_location_shares' and cmd='INSERT'),
  'direct live-location insert policies are removed'
);
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  'authenticated clients cannot update profile trust fields directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_preferences', 'UPDATE'),
  'authenticated clients cannot bypass preference validation'
);
select ok(
  not has_table_privilege('authenticated', 'public.profile_photos', 'INSERT'),
  'authenticated clients cannot self-approve profile photo rows'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'birth_date', 'SELECT'),
  'exact birth date is not a public profile column'
);
select is((select public from storage.buckets where id='profile-media'),false,'profile media bucket is private');
select is((select file_size_limit from storage.buckets where id='profile-media'),10485760::bigint,'profile media has a 10 MB server limit');
select ok((select 'image/jpeg'=any(allowed_mime_types) from storage.buckets where id='profile-media'),'profile media allows reviewed image MIME types');
select ok((select 'audio/mp4'=any(allowed_mime_types) from storage.buckets where id='profile-media'),'profile media allows bounded voice MIME types');
select is((select public from storage.buckets where id='chat-media'),false,'chat media bucket is private');
select is((select file_size_limit from storage.buckets where id='chat-media'),15728640::bigint,'chat media has a 15 MB server limit');
select ok((select 'image/gif'=any(allowed_mime_types) from storage.buckets where id='chat-media'),'chat media allowlist supports GIF messages');
select ok(
  exists(
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='members upload own profile media'
      and with_check like '%storage.foldername(name)%'
      and with_check like '%metadata%'
  ),
  'profile media upload policy validates member folder, kind, and MIME metadata'
);

select ok(
  exists(select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='active participants view messages'),
  'messages have the active-participant read policy'
);
select ok(
  not exists(select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='participants view messages after icebreaker'),
  'legacy permissive message read policy is removed'
);
select ok(
  not exists(select 1 from pg_policies where schemaname='public' and tablename='messages' and cmd='INSERT'),
  'direct message insert policies are removed'
);
select ok(
  not has_table_privilege('authenticated', 'public.messages', 'INSERT'),
  'authenticated clients cannot insert messages directly'
);

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000001','authenticated','authenticated','a@destinyone.test','',now(),now(),now()),
  ('00000000-0000-4000-8000-000000000002','authenticated','authenticated','b@destinyone.test','',now(),now(),now()),
  ('00000000-0000-4000-8000-000000000003','authenticated','authenticated','c@destinyone.test','',now(),now(),now()),
  ('00000000-0000-4000-8000-000000000004','authenticated','authenticated','d@destinyone.test','',now(),now(),now()),
  ('00000000-0000-4000-8000-000000000005','authenticated','authenticated','e@destinyone.test','',now(),now(),now());

insert into public.profiles(id, first_name, birth_date, city, profession, onboarding_complete)
values
  ('00000000-0000-4000-8000-000000000001','Asha','1995-01-01','Toronto, ON','Product Manager',true),
  ('00000000-0000-4000-8000-000000000002','Rohan','1993-02-02','Toronto, ON','Engineer',true),
  ('00000000-0000-4000-8000-000000000003','Maya','1994-03-03','New York, NY','Designer',true),
  ('00000000-0000-4000-8000-000000000004','Diya','1997-04-04','Toronto, ON','Architect',true),
  ('00000000-0000-4000-8000-000000000005','Eva','1996-05-05','Toronto, ON','Attorney',true);

insert into public.user_preferences(user_id,intent,vibes)
values
  ('00000000-0000-4000-8000-000000000004','long_term_to_marriage',array['Family First','Ambitious']),
  ('00000000-0000-4000-8000-000000000005','long_term_to_marriage',array['Family First']);
insert into public.profile_match_attributes(user_id,gender,family_priority,children_intent,marriage_timeline,relocation,languages)
values
  ('00000000-0000-4000-8000-000000000004','woman','high','wants','1_2_years','open',array['English','Hindi']),
  ('00000000-0000-4000-8000-000000000005','woman','high','wants','1_2_years','open',array['English']);
insert into public.matching_preferences(user_id,looking_for,min_age,max_age)
values
  ('00000000-0000-4000-8000-000000000004','women',25,35),
  ('00000000-0000-4000-8000-000000000005','men',25,35);
insert into public.profile_photos(user_id,storage_path,position,approved)
values
  ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000004/photo/approved.jpg',0,true),
  ('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000005/photo/approved.jpg',0,true);

insert into public.matches(id,user_a,user_b,label,score_internal,status,matched_at)
values
  ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','great',91,'mutual',now()),
  ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','good',84,'mutual',now());
insert into public.icebreakers(match_id,question,user_a_answer,user_b_answer,unlocked_at)
values
  ('10000000-0000-4000-8000-000000000001','Coffee or walk?','Coffee','Walk',now()),
  ('10000000-0000-4000-8000-000000000002','Museum or dinner?','Museum','Dinner',now());
insert into public.messages(id,match_id,sender_id,kind,body)
values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','text','Hello');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);

select is(
  (public.get_current_member_bootstrap()->>'user_id')::text,
  '00000000-0000-4000-8000-000000000001',
  'bootstrap identity comes from auth.uid()'
);
select is(
  public.get_current_member_bootstrap()->'profile'->>'birth_date',
  '1995-01-01',
  'member bootstrap returns the owner private birth date'
);
select lives_ok(
  $$select public.save_current_member_profile(
    jsonb_build_object(
      'first_name','Asha',
      'birth_date','1995-01-01',
      'city','Toronto, ON',
      'profession','Product Manager',
      'height_cm',165,
      'religion','Hindu',
      'community','South Asian',
      'bio','Marriage-minded and family-oriented.'
    ),
    jsonb_build_object(
      'intent','marriage',
      'vibes',jsonb_build_array('Family First','Ambitious'),
      'smart_discovery',true,
      'crossed_paths',false
    )
  )$$,
  'validated member profile saves through the RPC'
);
select is(
  (select verified from public.profiles where id='00000000-0000-4000-8000-000000000001'),
  false,
  'profile save cannot self-verify a member'
);
select is(
  (select onboarding_complete from public.profiles where id='00000000-0000-4000-8000-000000000001'),
  true,
  'validated profile save completes onboarding'
);
select lives_ok(
  $$select public.save_matching_preferences(
    jsonb_build_object(
      'looking_for','women','min_age',25,'max_age',35,'cities',jsonb_build_array('Toronto, ON'),
      'intents',jsonb_build_array('long_term_to_marriage'),'must_have_vibes',jsonb_build_array('Family First'),
      'family_priority','high','children','wants','marriage_timeline','1_2_years',
      'relocation','open','distance_preference','selected_cities','smart_discovery',true
    ),
    jsonb_build_object(
      'gender','woman','family_priority','high','children_intent','wants',
      'marriage_timeline','1_2_years','relocation','open','languages',jsonb_build_array('English','Hindi')
    )
  )$$,
  'matching preferences save through the validated RPC'
);
select is(
  (select count(*)::integer from public.daily_matches(5)),
  0,
  'unverified members cannot enter discovery'
);
select is(
  public.get_matching_pool_status()->>'status',
  'verification_required',
  'pool status gives an actionable verification boundary'
);
reset role;
update public.profiles set verified=true where id in(
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005'
);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select lives_ok(
  $$select * from public.daily_matches(5)$$,
  'server generates a reciprocal daily recommendation deck'
);
select is(
  (select profile_id::text from public.daily_matches(5) limit 1),
  '00000000-0000-4000-8000-000000000004',
  'reciprocal eligible member is recommended'
);
select is(
  (select count(*)::integer from public.daily_matches(5) where profile_id='00000000-0000-4000-8000-000000000005'),
  0,
  'candidate whose reciprocal preference rejects the viewer is excluded'
);
select ok(
  (select cardinality(reasons) between 1 and 3 from public.daily_matches(5) limit 1),
  'recommendation exposes a small plain-language explanation set'
);
select is(
  (select model_version from public.daily_matches(5) limit 1),
  'intentional-v2',
  'recommendation records the active rollback-safe model version'
);
select ok(
  'A language in common'=any((select reasons from public.daily_matches(5) limit 1)),
  'recommendation can explain a shared language without exposing a score'
);
select is(
  public.get_matching_pool_status()->>'status',
  'sparse',
  'small verified pools stay explicit instead of silently relaxing hard preferences'
);
select is(
  (select count(*)::integer from public.daily_match_recommendations where user_id='00000000-0000-4000-8000-000000000001'),
  1,
  'one exposure record is stored for the generated deck'
);
select lives_ok(
  $$select public.record_discovery_signal('00000000-0000-4000-8000-000000000004','view','discovery-action-0001')$$,
  'discovery learning records through the server-owned RPC'
);
select lives_ok(
  $$select public.record_discovery_signal('00000000-0000-4000-8000-000000000004','view','discovery-action-0001')$$,
  'discovery learning retry is idempotent'
);
select is(
  (select count(*)::integer from public.discovery_signals where client_action_id='discovery-action-0001'),
  1,
  'discovery retry creates one first-party signal'
);
select throws_ok(
  $$select public.save_current_member_profile(
    jsonb_build_object(
      'first_name','Asha','birth_date','1995-01-01','city','Toronto, ON',
      'profession','Product Manager','verified',true
    ),
    jsonb_build_object('intent','marriage','vibes',jsonb_build_array('Family First'))
  )$$,
  'P0001',
  'Unsupported profile field',
  'protected profile fields are rejected'
);
select is((select count(*)::integer from public.messages),1,'unblocked unlocked participant can read chat');
select is(
  public.send_match_message(
    '10000000-0000-4000-8000-000000000001',
    'client-message-0001',
    'text',
    'A secure hello'
  )->>'id',
  public.send_match_message(
    '10000000-0000-4000-8000-000000000001',
    'client-message-0001',
    'text',
    'A secure hello'
  )->>'id',
  'retries return the original message row'
);
select is((select count(*)::integer from public.messages),2,'idempotent retry creates one message');
select lives_ok(
  $$select public.submit_match_feedback(
    '10000000-0000-4000-8000-000000000001','promising',true,'feedback-action-0001'
  )$$,
  'member can consent to coarse relationship outcome learning'
);
select is(
  (select count(*)::integer from public.match_feedback where client_action_id='feedback-action-0001'),
  1,
  'one private feedback record is stored'
);
select is(
  (select use_for_matching from public.match_feedback where client_action_id='feedback-action-0001'),
  true,
  'matching outcome is active only with explicit consent'
);
select lives_ok(
  $$select public.clear_matching_learning()$$,
  'member can erase discovery learning and revoke outcome use'
);
select is(
  (select count(*)::integer from public.discovery_signals where user_id='00000000-0000-4000-8000-000000000001'),
  0,
  'learning reset removes discovery signals'
);
select is(
  (select use_for_matching from public.match_feedback where client_action_id='feedback-action-0001'),
  false,
  'learning reset revokes match-feedback consent'
);
select lives_ok(
  $$select public.submit_match_decision('00000000-0000-4000-8000-000000000004','interested')$$,
  'member can choose a profile from the current verified deck'
);
select is(
  (public.get_matching_pool_status()->>'eligible_count')::integer,
  0,
  'an already-chosen profile does not recycle into the eligible pool'
);
select lives_ok(
  $$select public.submit_member_report(
    '00000000-0000-4000-8000-000000000002'::uuid,
    'Safety concern',
    'Asked for private home details.',
    'report-action-0001'
  )$$,
  'report submits through the server-owned RPC'
);
select is(
  (select severity from public.reports where client_action_id='report-action-0001'),
  'critical',
  'safety concern enters the critical triage queue'
);
select lives_ok(
  $$select public.submit_member_report(
    '00000000-0000-4000-8000-000000000002'::uuid,
    'Safety concern',
    'Asked for private home details.',
    'report-action-0001'
  )$$,
  'report retry is idempotent'
);
select is(
  (select count(*)::integer from public.reports where client_action_id='report-action-0001'),
  1,
  'report retry creates one moderation item'
);
select is(
  (select count(*)::integer from public.safety_action_events where action='report_submitted'),
  1,
  'report submission creates one audit event'
);
select lives_ok(
  $$select public.start_live_location_share(
    '10000000-0000-4000-8000-000000000001'::uuid,
    'location-action-0001',
    43.6532,
    -79.3832,
    12,
    30
  )$$,
  'live location starts through the gated RPC'
);
select is(
  public.start_live_location_share(
    '10000000-0000-4000-8000-000000000001'::uuid,
    'location-action-0001',
    43.6532,
    -79.3832,
    12,
    30
  )->>'id',
  (select id::text from public.live_location_shares where client_action_id='location-action-0001'),
  'live-location retry returns the original share'
);
select is(
  (select metadata from public.safety_action_events where action='live_location_started'),
  jsonb_build_object('duration_minutes',30),
  'location audit stores duration without coordinates'
);
select lives_ok(
  $$select public.unmatch_member(
    '10000000-0000-4000-8000-000000000002'::uuid,
    'unmatch-action-0001'
  )$$,
  'mutual match can be ended through the server-owned RPC'
);

reset role;
select is(
  (select status::text from public.matches where id='10000000-0000-4000-8000-000000000002'),
  'passed',
  'unmatch persists the relationship status'
);
select is(
  (select count(*)::integer from public.safety_action_events where action='match_unmatched'),
  1,
  'unmatch creates one audit event'
);
select is(
  (select count(*)::integer from public.live_location_shares where client_action_id='location-action-0001' and live),
  1,
  'unmatching a different relationship does not stop an active share'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select lives_ok(
  $$select public.block_member('00000000-0000-4000-8000-000000000002'::uuid)$$,
  'block RPC succeeds for an authenticated member'
);
select is((select count(*)::integer from public.matches where id='10000000-0000-4000-8000-000000000001'),0,'blocked match is no longer visible through RLS');
select is((select count(*)::integer from public.profiles where id='00000000-0000-4000-8000-000000000002'),0,'blocked profile is hidden');
select is((select count(*)::integer from public.messages),0,'blocked conversation is hidden');
reset role;
select is(
  (select count(*)::integer from public.live_location_shares where client_action_id='location-action-0001' and live),
  0,
  'blocking immediately terminates active location sharing'
);
select is(
  (select count(*)::integer from public.safety_action_events where action='member_blocked'),
  1,
  'block creates one audit event'
);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select throws_ok(
  $$select public.send_match_message('10000000-0000-4000-8000-000000000001','client-message-0002','text','blocked')$$,
  'P0001',
  'This conversation is unavailable',
  'blocked participant cannot send through the RPC'
);

select * from finish();
rollback;
