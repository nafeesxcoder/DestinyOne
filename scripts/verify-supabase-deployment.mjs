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
};

async function probe(kind, name) {
  const endpoint = kind === 'rpc'
    ? `${url}/rest/v1/rpc/${name}`
    : `${url}/rest/v1/${name}?select=*&limit=0`;
  const response = await fetch(endpoint, {
    method: kind === 'rpc' ? 'POST' : 'GET',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: kind === 'rpc' ? JSON.stringify(rpcBodies[name] ?? {}) : undefined,
  });
  const body = await response.json().catch(() => ({}));
  const missing = response.status === 404 && (body.code === 'PGRST202' || body.code === 'PGRST205');
  return { kind, name, present: !missing, status: response.status, code: body.code ?? null };
}

const authResponse = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
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
};

console.log(JSON.stringify(summary, null, 2));
if (!authResponse.ok || summary.present !== summary.expected) process.exit(1);
