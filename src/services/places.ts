import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type MarketplacePlaceCategory =
  | 'Restaurant'
  | 'Cafe'
  | 'Hotel'
  | 'Wellness'
  | 'Tourist'
  | 'Activity'
  | 'Park'
  | 'Dessert'
  | 'Lounge'
  | 'Cultural';

export type MarketplacePlace = {
  id: string;
  name: string;
  address: string;
  city: string;
  category: MarketplacePlaceCategory;
  price: string;
  rating?: number;
  ratingCount?: number;
  openNow?: boolean;
  mapsUrl?: string;
  latitude?: number;
  longitude?: number;
};

export type MarketplacePlacePage = {
  places: MarketplacePlace[];
  nextPageToken?: string;
};

type SearchPlacesResponse = MarketplacePlacePage & { error?: string };

export async function searchMarketplacePlaces(input: {
  city: string;
  query?: string;
  category?: MarketplacePlaceCategory | 'All';
  pageToken?: string;
}): Promise<MarketplacePlacePage | null> {
  if (!isSupabaseConfigured) return null;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new Error('Sign in to search live places.');

  const { data, error } = await supabase.functions.invoke<SearchPlacesResponse>('search-places', {
    body: input,
  });
  if (error) throw new Error(data?.error || error.message || 'Live place search is temporarily unavailable.');
  if (data?.error) throw new Error(data.error);
  return { places: data?.places ?? [], nextPageToken: data?.nextPageToken };
}
