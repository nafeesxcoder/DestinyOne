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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const googleMapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401);
  if (!supabaseUrl || !anonKey) return json({ error: 'Search service is not configured' }, 503);
  if (!googleMapsKey) return json({ error: 'Live place search is being set up. Please try again shortly.' }, 503);

  const member = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: authorization, apikey: anonKey } });
  if (!member.ok) return json({ error: 'Authentication required' }, 401);

  try {
    const body = await req.json() as { city?: string; query?: string; category?: string };
    const city = body.city?.trim().replace(/\s+/g, ' ');
    const query = body.query?.trim().replace(/\s+/g, ' ');
    const category = body.category?.trim().replace(/\s+/g, ' ');
    if (!city || city.length < 2 || city.length > 100) return json({ error: 'Choose a valid USA or Canada city.' }, 400);
    if ((query?.length ?? 0) > 100 || (category?.length ?? 0) > 40) return json({ error: 'Search is too long.' }, 400);

    const searchTopic = query || (category && category !== 'All' ? category : 'romantic date places');
    const searchTerms = `${searchTopic} in ${city}`;
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleMapsKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.primaryType,places.types,places.rating,places.userRatingCount,places.businessStatus,places.currentOpeningHours.openNow,places.googleMapsUri',
      },
      body: JSON.stringify({ textQuery: searchTerms, maxResultCount: 12, languageCode: 'en' }),
    });
    if (!response.ok) {
      console.error('Google Places search failed', response.status);
      return json({ error: 'Live place search is temporarily unavailable.' }, 502);
    }
    const payload = await response.json() as { places?: GooglePlace[] };
    const places = (payload.places ?? [])
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
    return json({ places });
  } catch (error) {
    console.error('Invalid places search request', error);
    return json({ error: 'Invalid place search request.' }, 400);
  }
});
