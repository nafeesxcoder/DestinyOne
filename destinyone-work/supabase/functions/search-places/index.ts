const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PlaceCategory = 'Restaurant' | 'Cafe' | 'Hotel' | 'Wellness' | 'Tourist' | 'Activity' | 'Park' | 'Dessert' | 'Lounge' | 'Cultural';

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  primaryType?: string;
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  businessStatus?: string;
  currentOpeningHours?: { openNow?: boolean };
  googleMapsUri?: string;
};

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function categoryFor(place: GooglePlace): PlaceCategory {
  const types = [place.primaryType, ...(place.types ?? [])].filter(Boolean).join(' ').toLowerCase();
  if (/cafe|coffee|tea_house/.test(types)) return 'Cafe';
  if (/dessert|bakery|ice_cream/.test(types)) return 'Dessert';
  if (/restaurant|meal_takeaway/.test(types)) return 'Restaurant';
  if (/bar|night_club|wine_bar/.test(types)) return 'Lounge';
  if (/hotel|lodging/.test(types)) return 'Hotel';
  if (/spa|wellness|beauty_salon/.test(types)) return 'Wellness';
  if (/park|garden/.test(types)) return 'Park';
  if (/museum|art_gallery|cultural/.test(types)) return 'Cultural';
  if (/tourist_attraction|landmark/.test(types)) return 'Tourist';
  return 'Activity';
}

function searchTopicsFor(query: string | undefined, category: string | undefined) {
  const cleanQuery = query?.trim();
  if (cleanQuery) return [cleanQuery];

  const categoryTopics: Record<string, string[]> = {
    Restaurant: ['date night restaurants'],
    Cafe: ['coffee shops cafes tea houses'],
    Hotel: ['boutique hotels rooftop hotels'],
    Wellness: ['spas wellness experiences'],
    Tourist: ['tourist attractions landmarks'],
    Activity: ['fun date activities things to do'],
    Park: ['parks gardens outdoor walks'],
    Dessert: ['dessert bakeries ice cream'],
    Lounge: ['cocktail lounges wine bars'],
    Cultural: ['museums art galleries cultural experiences'],
  };
  if (category && category !== 'All' && categoryTopics[category]) return categoryTopics[category];

  // One city search should be genuinely useful across the whole date journey,
  // not just return a dozen generic businesses from a single query.
  return [
    'date night restaurants cafes dessert lounges',
    'boutique hotels spas wellness experiences',
    'things to do parks museums tourist attractions activities',
  ];
}

function serviceHeaders(serviceRoleKey: string, extra: Record<string, string> = {}) {
  return { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, ...extra };
}

async function previewFingerprint(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const client = forwardedFor || req.headers.get('cf-connecting-ip') || req.headers.get('user-agent') || 'unknown-preview-client';
  const bytes = new TextEncoder().encode(client);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  const previewOrigin = 'https://destinyone-preview-shivay.shivay247.chatgpt.site';
  const isPreviewRequest = req.headers.get('origin') === previewOrigin;
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const googleMapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Search service is not configured' }, 503);
  if (!googleMapsKey) return json({ error: 'Live place search is being set up. Please try again shortly.' }, 503);

  let memberId: string | undefined;
  if (authorization?.startsWith('Bearer ')) {
    const member = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: authorization, apikey: anonKey } });
    if (member.ok) {
      const memberBody = await member.json() as { id?: string };
      memberId = memberBody.id;
    }
  }
  if (!memberId && !isPreviewRequest) return json({ error: 'Authentication required' }, 401);

  try {
    const body = await req.json() as { city?: string; query?: string; category?: string };
    const city = body.city?.trim().replace(/\s+/g, ' ');
    const query = body.query?.trim().replace(/\s+/g, ' ');
    const category = body.category?.trim().replace(/\s+/g, ' ');
    if (!city || city.length < 2 || city.length > 100) return json({ error: 'Choose a valid USA or Canada city.' }, 400);
    if ((query?.length ?? 0) > 100 || (category?.length ?? 0) > 40) return json({ error: 'Search is too long.' }, 400);

    const normalizedQuery = query && query.toLowerCase() === city.toLowerCase() ? undefined : query;
    const searchTopics = searchTopicsFor(normalizedQuery, category);
    const cacheKey = `${city.toLowerCase()}|${category ?? 'All'}|${normalizedQuery?.toLowerCase() ?? 'browse'}`.slice(0, 300);
    const now = new Date().toISOString();
    const cached = await fetch(`${supabaseUrl}/rest/v1/google_places_search_cache?select=results&cache_key=eq.${encodeURIComponent(cacheKey)}&expires_at=gt.${encodeURIComponent(now)}`, {
      headers: serviceHeaders(serviceRoleKey),
    });
    if (cached.ok) {
      const entries = await cached.json() as { results?: unknown[] }[];
      if (entries[0]?.results) return json({ places: entries[0].results, cached: true });
    }

    // A member can cause at most 20 fresh searches per hour. The public web
    // preview is lower: 8 per hashed browser/network fingerprint per hour.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const previewClient = !memberId ? await previewFingerprint(req) : undefined;
    const requestTable = previewClient ? 'google_places_preview_requests' : 'google_places_search_requests';
    const requestFilter = previewClient
      ? `client_fingerprint=eq.${previewClient}`
      : `user_id=eq.${memberId}`;
    const requestLog = await fetch(`${supabaseUrl}/rest/v1/${requestTable}?select=id&${requestFilter}&created_at=gte.${encodeURIComponent(hourAgo)}`, {
      headers: serviceHeaders(serviceRoleKey),
    });
    if (!requestLog.ok) return json({ error: 'Search protection is temporarily unavailable.' }, 503);
    const recentRequests = await requestLog.json() as unknown[];
    const requestLimit = previewClient ? 8 : 20;
    if (recentRequests.length >= requestLimit) return json({ error: 'You have reached the live place-search limit for this hour. Try again shortly.' }, 429);

    const responses = await Promise.all(searchTopics.map(topic => fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleMapsKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.primaryType,places.types,places.rating,places.userRatingCount,places.businessStatus,places.currentOpeningHours.openNow,places.googleMapsUri',
      },
      body: JSON.stringify({ textQuery: `${topic} in ${city}`, maxResultCount: 12, languageCode: 'en' }),
    })));
    if (responses.every(response => !response.ok)) {
      console.error('Google Places search failed', responses.map(response => response.status).join(','));
      return json({ error: 'Live place search is temporarily unavailable.' }, 502);
    }
    const payloads = await Promise.all(responses.filter(response => response.ok).map(response => response.json() as Promise<{ places?: GooglePlace[] }>));
    const uniquePlaces = new Map<string, GooglePlace>();
    payloads.flatMap(payload => payload.places ?? []).forEach(place => {
      if (place.id && !uniquePlaces.has(place.id)) uniquePlaces.set(place.id, place);
    });
    const places = [...uniquePlaces.values()]
      .filter((place) => place.id && place.displayName?.text && place.businessStatus !== 'CLOSED_PERMANENTLY')
      .map((place) => ({
        id: `google-${place.id}`,
        name: place.displayName!.text!,
        address: place.formattedAddress ?? city,
        category: categoryFor(place),
        rating: place.rating,
        ratingCount: place.userRatingCount,
        openNow: place.currentOpeningHours?.openNow,
        mapsUrl: place.googleMapsUri,
      }));
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/google_places_search_cache`, {
        method: 'POST',
        headers: serviceHeaders(serviceRoleKey, { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify({ cache_key: cacheKey, results: places, expires_at: expiresAt }),
      }),
      fetch(`${supabaseUrl}/rest/v1/${requestTable}`, {
        method: 'POST',
        headers: serviceHeaders(serviceRoleKey, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify(previewClient ? { client_fingerprint: previewClient, cache_key: cacheKey } : { user_id: memberId, cache_key: cacheKey }),
      }),
    ]);
    return json({ places });
  } catch (error) {
    console.error('Invalid places search request', error);
    return json({ error: 'Invalid place search request.' }, 400);
  }
});
