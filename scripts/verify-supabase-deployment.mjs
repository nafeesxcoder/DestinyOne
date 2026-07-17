import { existsSync, readFileSync } from 'node:fs';

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY before verification.');
  process.exit(2);
}

const objects = [
  ['table', 'profiles'],
  ['table', 'messages'],
  ['table', 'member_notifications'],
  ['table', 'relationship_reflections'],
  ['table', 'relationship_learning_signals'],
  ['table', 'relationship_reminders'],
  ['table', 'gift_orders'],
  ['table', 'live_location_shares'],
  ['table', 'safety_action_events'],
  ['table', 'profile_match_attributes'],
  ['table', 'matching_preferences'],
  ['table', 'daily_match_recommendations'],
  ['table', 'match_feedback'],
  ['table', 'matching_model_versions'],
  ['table', 'matching_model_events'],
  ['table', 'city_launch_markets'],
  ['table', 'city_waitlist_entries'],
  ['table', 'city_referral_invites'],
  ['table', 'city_ambassador_applications'],
  ['table', 'city_liquidity_snapshots'],
  ['table', 'city_cohort_snapshots'],
  ['table', 'marketplace_partners'],
  ['table', 'marketplace_venues'],
  ['table', 'marketplace_offerings'],
  ['table', 'marketplace_availability_slots'],
  ['table', 'marketplace_reservation_quotes'],
  ['table', 'marketplace_reservation_orders'],
  ['table', 'marketplace_reservation_events'],
  ['table', 'marketplace_provider_webhook_receipts'],
  ['table', 'growth_attribution_touches'],
  ['table', 'growth_events'],
  ['table', 'growth_experiments'],
  ['table', 'growth_experiment_assignments'],
  ['table', 'growth_referral_conversions'],
  ['table', 'growth_reward_ledger'],
  ['table', 'growth_daily_cohort_snapshots'],
  ['table', 'billing_products'],
  ['table', 'billing_purchase_sessions'],
  ['table', 'billing_purchase_receipts'],
  ['table', 'billing_entitlement_ledger'],
  ['table', 'billing_entitlement_snapshots'],
  ['table', 'billing_webhook_receipts'],
  ['table', 'billing_refund_cases'],
  ['table', 'billing_daily_finance_snapshots'],
  ['rpc', 'daily_matches'],
  ['rpc', 'get_current_member_bootstrap'],
  ['rpc', 'send_match_message'],
  ['rpc', 'save_current_member_profile'],
  ['rpc', 'submit_member_report'],
  ['rpc', 'unmatch_member'],
  ['rpc', 'start_live_location_share'],
  ['rpc', 'save_matching_preferences'],
  ['rpc', 'record_discovery_signal'],
  ['rpc', 'submit_match_feedback'],
  ['rpc', 'clear_matching_learning'],
  ['rpc', 'submit_match_decision'],
  ['rpc', 'join_city_waitlist'],
  ['rpc', 'create_city_referral'],
  ['rpc', 'apply_city_ambassador'],
  ['rpc', 'create_marketplace_quote'],
  ['rpc', 'create_marketplace_reservation_order'],
  ['rpc', 'respond_marketplace_reservation_order'],
  ['rpc', 'prepare_marketplace_payment'],
  ['rpc', 'cancel_marketplace_reservation_order'],
  ['rpc', 'record_growth_event'],
  ['rpc', 'record_growth_attribution_touch'],
  ['rpc', 'redeem_growth_referral'],
  ['rpc', 'assign_growth_experiment'],
  ['rpc', 'get_current_entitlements'],
  ['rpc', 'restore_store_purchases'],
  ['rpc', 'request_billing_refund'],
  ['rpc', 'prepare_store_purchase'],
  ['rpc', 'consume_billing_entitlement'],
];

const rpcBodies = {
  daily_matches: { result_limit: 1 },
  send_match_message: {
    p_match_id: '00000000-0000-4000-8000-000000000000',
    p_client_message_id: 'deployment-probe',
    p_kind: 'text',
    p_body: 'probe',
  },
  save_current_member_profile: {
    p_profile: {},
    p_preferences: {},
  },
  submit_member_report: {
    p_reported_id: '00000000-0000-4000-8000-000000000000',
    p_reason: 'Safety concern',
    p_details: 'deployment probe',
    p_client_action_id: 'deployment-probe',
  },
  unmatch_member: {
    p_match_id: '00000000-0000-4000-8000-000000000000',
    p_client_action_id: 'deployment-probe',
  },
  start_live_location_share: {
    p_match_id: '00000000-0000-4000-8000-000000000000',
    p_client_action_id: 'deployment-probe',
    p_latitude: 0,
    p_longitude: 0,
    p_accuracy_m: 10,
    p_duration_minutes: 5,
  },
  save_matching_preferences: {
    p_preferences: {},
    p_attributes: {},
  },
  record_discovery_signal: {
    p_target_id: '00000000-0000-4000-8000-000000000000',
    p_signal: 'view',
    p_client_action_id: 'deployment-probe',
  },
  submit_match_feedback: {
    p_match_id: '00000000-0000-4000-8000-000000000000',
    p_feedback: 'not_aligned',
    p_use_for_matching: false,
    p_client_action_id: 'deployment-probe',
  },
  submit_match_decision: {
    recipient_id: '00000000-0000-4000-8000-000000000000',
    decision: 'pass',
  },
  join_city_waitlist: {
    p_city_key: 'toronto',
    p_locality: 'Toronto',
    p_region: 'Ontario',
    p_country_code: 'CA',
    p_source: 'member',
  },
  create_city_referral: { p_city_key: 'toronto' },
  apply_city_ambassador: {
    p_city_key: 'toronto',
    p_community_reach: 'deployment probe community reach',
    p_hosting_experience: 'deployment probe hosting experience',
    p_safety_commitment: true,
  },
  request_billing_refund: {
    p_receipt_id: '00000000-0000-4000-8000-000000000000',
    p_reason: 'deployment probe request',
    p_idempotency_key: 'deployment-probe',
  },
  prepare_store_purchase: {
    p_product_key: 'plus_monthly',
    p_platform: 'apple_iap',
    p_idempotency_key: 'deployment-probe',
  },
  consume_billing_entitlement: {
    p_entitlement_key: 'spark_wallet',
    p_units: 1,
    p_idempotency_key: 'deployment-probe',
  },
};

async function probe(kind, name) {
  const endpoint = kind === 'rpc'
    ? `${url}/rest/v1/rpc/${name}`
    : `${url}/rest/v1/${name}?select=*&limit=0`;
  const response = await fetch(endpoint, {
    method: kind === 'rpc' ? 'POST' : 'GET',
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      Prefer: 'tx=rollback,return=minimal',
    },
    body: kind === 'rpc' ? JSON.stringify(rpcBodies[name] ?? {}) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json().catch(() => ({}));
  const missing = response.status === 404 && (body.code === 'PGRST202' || body.code === 'PGRST205');
  return {
    kind,
    name,
    present: !missing,
    anonymousAccess: response.ok,
    healthy: response.status < 500,
    status: response.status,
    code: body.code ?? null,
  };
}

const authResponse = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: key },
  signal: AbortSignal.timeout(10_000),
});
const auth = await authResponse.json().catch(() => ({}));
const results = [];
for (const [kind, name] of objects) results.push(await probe(kind, name));

const summary = {
  auth: {
    reachable: authResponse.ok,
    email: auth?.external?.email === true,
    phone: auth?.external?.phone === true,
    google: auth?.external?.google === true,
    smsProvider: auth?.sms_provider ?? null,
  },
  schema: results,
  present: results.filter((item) => item.present).length,
  expected: results.length,
  missing: results.filter((item) => !item.present).map((item) => `${item.kind}:${item.name}`),
  anonymousExposures: results.filter((item) => item.anonymousAccess).map((item) => `${item.kind}:${item.name}`),
  unhealthy: results.filter((item) => !item.healthy).map((item) => `${item.kind}:${item.name}`),
};

console.log(JSON.stringify(summary, null, 2));
if (
  !authResponse.ok ||
  summary.present !== summary.expected ||
  summary.anonymousExposures.length > 0 ||
  summary.unhealthy.length > 0
) process.exit(1);
