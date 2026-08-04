import type { Database, Json, PreferenceRow, ProfileRow } from '../types/database';

export type MemberBootstrap = {
  userId: string;
  profile: ProfileRow | null;
  preferences: PreferenceRow | null;
  photos: Array<{ id: string; storage_path: string; position: number; approved: boolean }>;
  matchingPreferences: Database['public']['Tables']['matching_preferences']['Row'] | null;
  matchAttributes: Database['public']['Tables']['profile_match_attributes']['Row'] | null;
};

function objectValue(value: Json | undefined): Record<string, Json | undefined> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, Json | undefined>
    : null;
}

export function parseMemberBootstrap(value: Json): MemberBootstrap {
  const root = objectValue(value);
  if (!root || typeof root.user_id !== 'string') {
    throw new Error('Backend returned an invalid member bootstrap payload.');
  }
  const rawPhotos = Array.isArray(root.photos) ? root.photos : [];
  const photos = rawPhotos.flatMap((photo) => {
    const row = objectValue(photo);
    if (!row || typeof row.id !== 'string' || typeof row.storage_path !== 'string') return [];
    return [{
      id: row.id,
      storage_path: row.storage_path,
      position: typeof row.position === 'number' ? row.position : 0,
      approved: row.approved === true,
    }];
  });

  return {
    userId: root.user_id,
    profile: objectValue(root.profile) as ProfileRow | null,
    preferences: objectValue(root.preferences) as PreferenceRow | null,
    matchingPreferences: objectValue(root.matching_preferences) as MemberBootstrap['matchingPreferences'],
    matchAttributes: objectValue(root.match_attributes) as MemberBootstrap['matchAttributes'],
    photos,
  };
}

export function memberNeedsOnboarding(member: MemberBootstrap) {
  return !member.profile?.onboarding_complete;
}
