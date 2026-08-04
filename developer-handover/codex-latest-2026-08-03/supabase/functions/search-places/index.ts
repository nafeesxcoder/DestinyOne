const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const categories = [
  'Restaurant', 'Cafe', 'Hotel', 'Wellness', 'Tourist',
  'Activity', 'Park', 'Dessert', 'Lounge', 'Cultural', 'All',
] as const;

type Category = (typeof categories)[number];
type SearchInput = { city?: string; query?: string; category?: Category; pageToken?: string };
type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  primaryType?: string;
  types?: string[];
  priceLevel?: string;
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: { openNow?: boolean };
  googleMapsUri?: string;
  location?: { latitude?: number; longitude?: number };
};

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function clean(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function categoryFor(place: GooglePlace, requested: Category): Exclude<Category, 'All'> {
  const types = [place.primaryType, ...(place.types ?? [])].filter(Boolean).join(' ').toLowerCase();
  if (/cafe|coffee/.test(types)) return 'Cafe';
  if (/hotel|lodging|resort/.test(types)) return 'Hotel';
  if (/spa|wellness|gym|yoga/.test(types)) return 'Wellness';
  if (/park|garden/.test(types)) return 'Park';
  if (/museum|art_gallery|library|cultural/.test(types)) return 'Cultural';
  if (/tourist|landmark|zoo|aquarium/.test(types)) return 'Tourist';
  if (/dessert|bakery|ice_cream/.test(types)) return 'Dessert';
  if (/bar|night_club|lounge/.test(types)) return 'Lounge';
  if (/amusement|bowling|movie_theater|event|tour/.test(types)) return 'Activity';
  if (/restaurant|meal_takeaway|food/.test(types)) return 'Restaurant';
  return requested === 'All' ? 'Activity' : requested;
}

function priceFor(level?: string) {
  return level === 'PRICE_LEVEL_FREE' ? 'Free'
    : level === 'PRICE_LEVEL_INEXPENSIVE' ? '$'
      : level === 'PRICE_LEVEL_MODERATE' ? '$$'
        : level === 'PRICE_LEVEL_EXPENSIVE' ? '$$$'
          : level === 'PRICE_LEVEL_VERY_EXPENSIVE' ? '$$$$' : 'Check pricing';
}

function categoryQuery(category: Category) {
  const queries: Record<Category, string> = {
    All: 'romantic date places', Restaurant: 'restaurants for a date', Cafe: 'cafes for a date',
    Hotel: 'romantic hotels', Wellness: 'spa and wellness', Tourist: 'tourist attractions',
    Activity: 'date activities', Park: 'parks and gardens', Dessert: 'dessert places',
    Lounge: 'cocktail lounges', Cultural: 'museums and cultural attractions',
  };
  return queries[category];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401);
  if (!apiKey || !supabaseUrl || !anonKey) return json({ error: 'Live places are not configured yet.' }, 503);

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: anonKey },
  });
  if (!authResponse.ok) return json({ error: 'Authentication required' }, 401);

  try {
    const body = await req.json() as SearchInput;
    const city = clean(body.city, 120);
    const query = clean(body.query, 120);
    const pageToken = clean(body.pageToken, 500);
    const category = categories.includes(body.category as Category) ? body.category as Category : 'All';
    if (!city) return json({ error: 'Choose a USA or Canada city first.' }, 400);

    const textQuery = `${query || categoryQuery(category)} in ${city}, ${/\b(ON|QC|BC|AB|MB|NS|NB|SK|PE|NL)\b/i.test(city) ? 'Canada' : 'USA'}`;
    const placesResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.primaryType,places.types,places.priceLevel,places.rating,places.userRatingCount,places.currentOpeningHours.openNow,places.googleMapsUri,places.location,nextPageToken',
      },
      body: JSON.stringify({ textQuery, pageSize: 20, pageToken: pageToken || undefined, languageCode: 'en' }),
    });
    const responseBody = await placesResponse.json() as { places?: GooglePlace[]; nextPageToken?: string; error?: { message?: string } };
    if (!placesResponse.ok) {
      console.error('Places API error', responseBody.error?.message ?? 'unknown error');
      return json({ error: 'Live place search is temporarily unavailable.' }, 502);
    }

    const places = (responseBody.places ?? []).flatMap((place) => {
      const id = clean(place.id, 200);
      const name = clean(place.displayName?.text, 200);
      if (!id || !name) return [];
      return [{
        id,
        name,
        address: clean(place.formattedAddress, 300),
        city,
        category: categoryFor(place, category),
        price: priceFor(place.priceLevel),
        rating: typeof place.rating === 'number' ? place.rating : undefined,
        ratingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : undefined,
        openNow: typeof place.currentOpeningHours?.openNow === 'boolean' ? place.currentOpeningHours.openNow : undefined,
        mapsUrl: clean(place.googleMapsUri, 1000) || undefined,
        latitude: typeof place.location?.latitude === 'number' ? place.location.latitude : undefined,
        longitude: typeof place.location?.longitude === 'number' ? place.location.longitude : undefined,
      }];
    });
    return json({ places, nextPageToken: responseBody.nextPageToken });
  } catch (error) {
    console.error('search-places error', error);
    return json({ error: 'Invalid place search request.' }, 400);
  }
});
