import type { Match } from '../data';

export type LaunchCityName = 'NYC' | 'Bay Area' | 'Dallas' | 'Toronto' | 'Chicago';

export type CityLaunchStatus = 'Needs ambassador' | 'Waitlist seeding' | 'MVP seeded';

export type LaunchCityTarget = {
  name: LaunchCityName;
  market: string;
  aliases: string[];
  productionVerifiedGoal: number;
  waitlistGoal: number;
  ambassadorGoal: number;
  eventCadence: string;
};

export type CityLaunchPlan = LaunchCityTarget & {
  currentProfiles: number;
  status: CityLaunchStatus;
  nextAction: string;
};

export type NetworkActionScreen = 'circle' | 'events' | 'profile' | 'support' | 'discovery' | 'pricing';

export type NetworkGrowthLoopId =
  | 'city_launch'
  | 'waitlist_invite'
  | 'referral_rewards'
  | 'friend_vouch'
  | 'community_ambassadors'
  | 'indian_professional_events'
  | 'alumni_groups'
  | 'success_stories'
  | 'bring_3_verified_friends';

export type NetworkGrowthLoop = {
  id: NetworkGrowthLoopId;
  title: string;
  body: string;
  actionLabel: string;
  actionScreen: NetworkActionScreen;
  icon: 'location-outline' | 'mail-outline' | 'gift-outline' | 'people-outline' | 'megaphone-outline' | 'calendar-outline' | 'school-outline' | 'heart-circle-outline' | 'shield-checkmark-outline';
  active: boolean;
  priority: number;
};

export type InviteChallenge = {
  title: string;
  current: number;
  target: number;
  remaining: number;
  reward: string;
  complete: boolean;
};

export type NetworkEffectPlan = {
  launchCities: CityLaunchPlan[];
  priorityCity: CityLaunchPlan;
  inviteChallenge: InviteChallenge;
  loops: NetworkGrowthLoop[];
  successStoryPrompts: string[];
};

export const launchCityTargets: readonly LaunchCityTarget[] = [
  {
    name: 'NYC',
    market: 'New York / Jersey City',
    aliases: ['new york', 'brooklyn', 'queens', 'jersey city', 'hoboken', 'manhattan'],
    productionVerifiedGoal: 250,
    waitlistGoal: 1000,
    ambassadorGoal: 10,
    eventCadence: '2 chai mixers + 1 professional dinner / month',
  },
  {
    name: 'Bay Area',
    market: 'San Francisco / San Jose',
    aliases: ['san francisco', 'san jose', 'oakland', 'palo alto', 'fremont', 'sunnyvale', 'santa clara', 'mountain view', 'cupertino', 'berkeley'],
    productionVerifiedGoal: 250,
    waitlistGoal: 1000,
    ambassadorGoal: 10,
    eventCadence: 'startup/professional mixer every 2 weeks',
  },
  {
    name: 'Dallas',
    market: 'Dallas / Plano / Frisco',
    aliases: ['dallas', 'plano', 'frisco', 'irving', 'arlington'],
    productionVerifiedGoal: 220,
    waitlistGoal: 850,
    ambassadorGoal: 8,
    eventCadence: 'family-friendly brunch + professional mixer / month',
  },
  {
    name: 'Toronto',
    market: 'Toronto / Brampton / Mississauga',
    aliases: ['toronto', 'brampton', 'mississauga', 'scarborough', 'markham'],
    productionVerifiedGoal: 250,
    waitlistGoal: 1000,
    ambassadorGoal: 10,
    eventCadence: 'Punjabi/Indian professional mixer every 2 weeks',
  },
  {
    name: 'Chicago',
    market: 'Chicago / Naperville / Schaumburg',
    aliases: ['chicago', 'naperville', 'schaumburg', 'evanston'],
    productionVerifiedGoal: 180,
    waitlistGoal: 700,
    ambassadorGoal: 7,
    eventCadence: 'monthly safe-date café night + alumni table',
  },
] as const;

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function belongsToLaunchCity(city: string, target: LaunchCityTarget) {
  const normalized = normalize(city);
  return target.aliases.some((alias) => normalized.includes(alias));
}

function cityStatus(currentProfiles: number): CityLaunchStatus {
  if (currentProfiles >= 2) return 'MVP seeded';
  if (currentProfiles >= 1) return 'Waitlist seeding';
  return 'Needs ambassador';
}

function cityNextAction(status: CityLaunchStatus, target: LaunchCityTarget) {
  if (status === 'MVP seeded') return `Run ${target.eventCadence} and collect success stories.`;
  if (status === 'Waitlist seeding') return `Open waitlist invites and recruit ${target.ambassadorGoal} community ambassadors.`;
  return `Start with alumni groups, Indian professional circles and one anchor ambassador.`;
}

export function buildCityLaunchPlans(matches: readonly Match[]): CityLaunchPlan[] {
  return launchCityTargets.map((target) => {
    const currentProfiles = matches.filter((match) => belongsToLaunchCity(match.city, target)).length;
    const status = cityStatus(currentProfiles);
    return {
      ...target,
      currentProfiles,
      status,
      nextAction: cityNextAction(status, target),
    };
  });
}

export function buildNetworkEffectPlan(input: {
  matches: readonly Match[];
  selectedCities: readonly string[];
  verified: boolean;
  vouchesCount: number;
  invitedVerifiedFriends?: number;
}): NetworkEffectPlan {
  const launchCities = buildCityLaunchPlans(input.matches);
  const selectedPriority = launchCities.find((city) => input.selectedCities.some((selected) => belongsToLaunchCity(selected, city)));
  const priorityCity = selectedPriority ?? [...launchCities].sort((a, b) => b.currentProfiles - a.currentProfiles)[0] ?? launchCities[0]!;
  const inviteCurrent = Math.min(3, Math.max(0, input.invitedVerifiedFriends ?? input.vouchesCount));
  const inviteChallenge: InviteChallenge = {
    title: 'Bring 3 verified friends',
    current: inviteCurrent,
    target: 3,
    remaining: Math.max(0, 3 - inviteCurrent),
    reward: 'Unlock trusted-badge boost, gift coins, and city founder status.',
    complete: inviteCurrent >= 3,
  };
  const seededCities = launchCities.filter((city) => city.status === 'MVP seeded').length;

  const loops: NetworkGrowthLoop[] = [
    {
      id: 'city_launch',
      title: 'City-by-city launch density',
      body: `${priorityCity.name} is the current priority market. Build density before opening broad discovery.`,
      actionLabel: 'Tune city',
      actionScreen: 'discovery',
      icon: 'location-outline',
      active: seededCities > 0,
      priority: 100,
    },
    {
      id: 'waitlist_invite',
      title: 'Waitlist / invite system',
      body: `Invite-only entry keeps supply curated until each city reaches ${priorityCity.productionVerifiedGoal}+ verified singles.`,
      actionLabel: 'Invite',
      actionScreen: 'circle',
      icon: 'mail-outline',
      active: true,
      priority: 94,
    },
    {
      id: 'referral_rewards',
      title: 'Referral rewards',
      body: 'Reward quality invites with gift coins, profile boosts and event priority — not cheap spam points.',
      actionLabel: 'Rewards',
      actionScreen: 'circle',
      icon: 'gift-outline',
      active: true,
      priority: 90,
    },
    {
      id: 'friend_vouch',
      title: 'Friend vouch loop',
      body: `${input.vouchesCount}/3 vouches active. Character vouches create safety and organic growth together.`,
      actionLabel: 'Vouch',
      actionScreen: 'circle',
      icon: 'people-outline',
      active: input.vouchesCount > 0,
      priority: 86,
    },
    {
      id: 'community_ambassadors',
      title: 'Community ambassadors',
      body: 'Recruit trusted hosts in temples, gurdwaras, alumni groups and Indian professional circles.',
      actionLabel: 'Apply',
      actionScreen: 'support',
      icon: 'megaphone-outline',
      active: true,
      priority: 82,
    },
    {
      id: 'indian_professional_events',
      title: 'Indian professional events',
      body: 'City mixers, founder dinners, physician/law/tech tables and safe video speed dates.',
      actionLabel: 'Events',
      actionScreen: 'events',
      icon: 'calendar-outline',
      active: true,
      priority: 78,
    },
    {
      id: 'alumni_groups',
      title: 'College / alumni / professional groups',
      body: 'Seed high-trust cohorts from alumni, MBA, medical, legal, tech and founder communities.',
      actionLabel: 'Groups',
      actionScreen: 'events',
      icon: 'school-outline',
      active: true,
      priority: 74,
    },
    {
      id: 'success_stories',
      title: 'Success stories',
      body: 'Collect verified stories after safe dates, engagements and marriages to build trust city-by-city.',
      actionLabel: 'Share',
      actionScreen: 'profile',
      icon: 'heart-circle-outline',
      active: input.verified,
      priority: 70,
    },
    {
      id: 'bring_3_verified_friends',
      title: 'Bring 3 verified friends',
      body: inviteChallenge.complete
        ? 'Challenge complete — your city founder loop is ready.'
        : `${inviteChallenge.remaining} more verified friend${inviteChallenge.remaining === 1 ? '' : 's'} to unlock founder rewards.`,
      actionLabel: inviteChallenge.complete ? 'Claim' : 'Invite 3',
      actionScreen: 'circle',
      icon: 'shield-checkmark-outline',
      active: inviteChallenge.current > 0,
      priority: 68,
    },
  ];

  return {
    launchCities,
    priorityCity,
    inviteChallenge,
    loops: loops.sort((a, b) => b.priority - a.priority),
    successStoryPrompts: [
      'We met at a DestinyOne chai mixer and planned a second date safely.',
      'A friend vouch helped me feel comfortable enough to start the conversation.',
      'Our families aligned naturally because intent was clear from day one.',
    ],
  };
}
