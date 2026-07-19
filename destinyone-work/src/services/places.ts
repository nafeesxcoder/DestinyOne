import { allowsPreviewAuthBypass } from './backend';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type LivePlaceCategory = 'Restaurant' | 'Cafe' | 'Hotel' | 'Wellness' | 'Tourist' | 'Activity' | 'Park' | 'Dessert' | 'Lounge' | 'Cultural';

export type LivePlace = {
  id: string;
  name: string;
  address: string;
  category: LivePlaceCategory;
  rating?: number;
  ratingCount?: number;
  openNow?: boolean;
  mapsUrl?: string;
};

type PlacesResponse = { places?: LivePlace[]; error?: string };

/**
 * Google Places is called through an Edge Function. Browser and mobile builds
 * never contain the Google Maps server key. The registration-free preview has
 * an origin-bound, rate-limited route so prospective members can test search.
 */
export async function searchLivePlaces(input: { city: string; query?: string; category?: string }) {
  if (!isSupabaseConfigured) return [] as LivePlace[];
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session && !allowsPreviewAuthBypass) return [] as LivePlace[];

  const { data, error } = await supabase.functions.invoke<PlacesResponse>('search-places', { body: input });
  if (error) throw new Error('Live place search is temporarily unavailable.');
  if (data?.error) throw new Error(data.error);
  return data?.places ?? [];
}
