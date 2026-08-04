const jsonHeaders = { 'Content-Type': 'application/json' };

type Row = Record<string, unknown>;

type Profile = { id: string; city: string | null; verified: boolean; onboarding_complete: boolean; updated_at: string; created_at: string };
type Match = { id: string; user_a: string; user_b: string; status: string; matched_at: string | null };
type Message = { match_id: string; sender_id: string; created_at: string };
type DateProposal = { match_id: string; status: string; created_at: string };
type SafetyEvent = { match_id: string | null; created_at: string };

const markets = [
  { key: 'nyc', aliases: ['new york', 'manhattan', 'brooklyn', 'queens', 'jersey city', 'hoboken'] },
  { key: 'bay_area', aliases: ['san francisco', 'san jose', 'oakland', 'palo alto', 'fremont', 'sunnyvale', 'santa clara', 'mountain view', 'cupertino', 'berkeley'] },
  { key: 'dallas', aliases: ['dallas', 'plano', 'frisco', 'irving', 'arlington'] },
  { key: 'toronto', aliases: ['toronto', 'brampton', 'mississauga', 'scarborough', 'markham', 'vaughan'] },
  { key: 'chicago', aliases: ['chicago', 'naperville', 'schaumburg', 'evanston'] },
] as const;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const cronSecret = Deno.env.get('CITY_DENSITY_CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) return response({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return response({ error: 'City density worker is not configured' }, 503);

  try {
    const now = new Date();
    const snapshotWeek = mondayUtc(now);
    const [profiles, matches, messages, proposals, safetyEvents, waitlist, ambassadors] = await Promise.all([
      getRows<Profile>(supabaseUrl, serviceRoleKey, 'profiles', 'id,city,verified,onboarding_complete,updated_at,created_at'),
      getRows<Match>(supabaseUrl, serviceRoleKey, 'matches', 'id,user_a,user_b,status,matched_at'),
      getRows<Message>(supabaseUrl, serviceRoleKey, 'messages', 'match_id,sender_id,created_at'),
      getRows<DateProposal>(supabaseUrl, serviceRoleKey, 'date_proposals', 'match_id,status,created_at'),
      getRows<SafetyEvent>(supabaseUrl, serviceRoleKey, 'safety_action_events', 'match_id,created_at'),
      getRows<Row>(supabaseUrl, serviceRoleKey, 'city_waitlist_entries', 'city_key,status'),
      getRows<Row>(supabaseUrl, serviceRoleKey, 'city_ambassador_applications', 'city_key,status'),
    ]);

    const profileCity = new Map(profiles.map((profile) => [profile.id, cityKeyFor(profile.city)]));
    const outcomes: Array<Record<string, unknown>> = [];
    const failures: Array<{ city: string; error: string }> = [];

    for (const market of markets) {
      const metrics = buildMetrics({ market: market.key, profiles, profileCity, matches, messages, proposals, safetyEvents, waitlist, ambassadors, now });
      const cohort = [{
        cohort_key: 'all_verified_active',
        eligible_active_members: metrics.verified_active_members,
        median_reciprocal_candidates: 0,
        qualified_introductions: Math.round(metrics.qualified_introductions_per_active * metrics.verified_active_members),
      }];

      const result = await rpc(supabaseUrl, serviceRoleKey, 'record_city_density_week', {
        p_city_key: market.key,
        p_snapshot_week: snapshotWeek,
        p_metrics: metrics,
        p_cohorts: cohort,
        p_source_name: 'destinyone-weekly-aggregator',
        p_source_job_id: `city-density-${snapshotWeek}`,
        p_consent_policy_version: 'city-density-v1',
        p_idempotency_key: `city-density:${market.key}:${snapshotWeek}`,
      });
      if (result.ok) outcomes.push({ city: market.key, ...(result.data as Record<string, unknown>) });
      else failures.push({ city: market.key, error: result.error });
    }

    return response({ snapshotWeek, recorded: outcomes, failures, source: 'aggregated operational metrics; unavailable cohort/retention signals remain zero' }, failures.length ? 207 : 200);
  } catch (error) {
    console.error('City density refresh failed', error instanceof Error ? error.message : 'unknown');
    return response({ error: 'City density refresh failed' }, 502);
  }
});

function buildMetrics(input: {
  market: string;
  profiles: Profile[];
  profileCity: Map<string, string | null>;
  matches: Match[];
  messages: Message[];
  proposals: DateProposal[];
  safetyEvents: SafetyEvent[];
  waitlist: Row[];
  ambassadors: Row[];
  now: Date;
}) {
  const activeAfter = input.now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const active = input.profiles.filter((profile) => profileCityForProfile(profile, input.market) && profile.verified && profile.onboarding_complete && Date.parse(profile.updated_at) >= activeAfter);
  const activeIds = new Set(active.map((profile) => profile.id));
  const cityMatches = input.matches.filter((match) => activeIds.has(match.user_a) && activeIds.has(match.user_b));
  const messagesByMatch = new Map<string, Set<string>>();
  const messageCounts = new Map<string, Map<string, number>>();
  for (const message of input.messages) {
    if (!cityMatches.some((match) => match.id === message.match_id)) continue;
    const senders = messagesByMatch.get(message.match_id) ?? new Set<string>();
    senders.add(message.sender_id);
    messagesByMatch.set(message.match_id, senders);
    const counts = messageCounts.get(message.match_id) ?? new Map<string, number>();
    counts.set(message.sender_id, (counts.get(message.sender_id) ?? 0) + 1);
    messageCounts.set(message.match_id, counts);
  }
  const replied = cityMatches.filter((match) => (messagesByMatch.get(match.id)?.size ?? 0) >= 2).length;
  const meaningful = cityMatches.filter((match) => [...(messageCounts.get(match.id)?.values() ?? [])].filter((count) => count >= 3).length >= 2).length;
  const cityMatchIds = new Set(cityMatches.map((match) => match.id));
  const acceptedDates = input.proposals.filter((proposal) => cityMatchIds.has(proposal.match_id) && ['accepted', 'confirmed', 'completed'].includes(proposal.status)).length;
  const safetyCount = input.safetyEvents.filter((event) => event.match_id && cityMatchIds.has(event.match_id)).length;
  const verifiedActiveMembers = active.length;
  const denominator = cityMatches.length;
  return {
    verified_active_members: verifiedActiveMembers,
    // These remain deliberately zero until reciprocal preference cohorts and retention are measured from consented analytics.
    cohort_floor_percent: 0,
    median_eligible_candidates: 0,
    qualified_introductions_per_active: verifiedActiveMembers ? Number((cityMatches.length / verifiedActiveMembers).toFixed(2)) : 0,
    reply_rate_percent: percent(replied, denominator),
    meaningful_conversation_rate_percent: percent(meaningful, denominator),
    accepted_date_rate_percent: percent(acceptedDates, denominator),
    eight_week_retention_percent: 0,
    safety_incidents_per_100_dates: acceptedDates ? Number(((safetyCount / acceptedDates) * 100).toFixed(2)) : 0,
    waitlist_members: input.waitlist.filter((entry) => entry.city_key === input.market && entry.status !== 'declined').length,
    active_ambassadors: input.ambassadors.filter((entry) => entry.city_key === input.market && entry.status === 'approved').length,
    monthly_event_seats: 0,
  };
}

function cityKeyFor(city: string | null) {
  const value = city?.toLowerCase() ?? '';
  return markets.find((market) => market.aliases.some((alias) => value.includes(alias)))?.key ?? null;
}

function profileCityForProfile(profile: Profile, market: string) {
  return cityKeyFor(profile.city) === market;
}

function percent(numerator: number, denominator: number) {
  return denominator ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;
}

function mondayUtc(date: Date) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - day + 1);
  return value.toISOString().slice(0, 10);
}

async function getRows<T>(url: string, key: string, table: string, select: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=1000&offset=${offset}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!result.ok) throw new Error(`Could not read ${table}`);
    const page = await result.json() as T[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function rpc(url: string, key: string, name: string, payload: Record<string, unknown>): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const result = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { ...jsonHeaders, apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });
  if (!result.ok) return { ok: false, error: `RPC ${name} failed` };
  return { ok: true, data: await result.json() };
}

function response(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: jsonHeaders });
}
