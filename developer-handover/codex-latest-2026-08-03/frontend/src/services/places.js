import { api } from "./api";

export const dateCategories = ["All", "Restaurant", "Cafe", "Park", "Activity", "Cultural", "Hotel", "Wellness", "Tourist"];

const definitions = [
  ["Restaurant", "Top-rated romantic restaurants", "Dinner matched to cuisine, budget and date style", "$$"],
  ["Cafe", "Quiet coffee & chai", "A low-pressure public first meeting", "$"],
  ["Park", "Parks, gardens & sunset walks", "Easy conversation with a flexible exit", "Free"],
  ["Activity", "Something fun to do together", "Classes, comedy, games and local events", "$$"],
  ["Cultural", "Museums, galleries & culture", "Built-in conversation starters", "$–$$"],
  ["Hotel", "Hotels & vacation stays", "Compare stays and cancellation terms", "$$$"],
  ["Wellness", "Couples spa & wellness", "A relaxing shared experience", "$$$"],
  ["Tourist", "Local gems & weekend trips", "Fresh attractions around your profile city", "$–$$$"],
];

const categoryFromQuery = (query) => {
  const text = query.toLowerCase();
  if (/airbnb|hotel|stay|resort/.test(text)) return "Hotel";
  if (/restaurant|dinner|food|brunch/.test(text)) return "Restaurant";
  if (/coffee|cafe|chai/.test(text)) return "Cafe";
  if (/park|garden|walk|trail/.test(text)) return "Park";
  if (/museum|gallery|culture|art/.test(text)) return "Cultural";
  if (/spa|massage|wellness/.test(text)) return "Wellness";
  if (/trip|travel|attraction|romantic place/.test(text)) return "Tourist";
  if (/activity|comedy|class|game|things to do/.test(text)) return "Activity";
  return "All";
};

const providerLinks = (city, query) => ({
  maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query} ${city}`)}`,
  airbnb: `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes`,
  hotels: `https://www.google.com/travel/search?q=${encodeURIComponent(`${query} ${city}`)}`,
});

export function fallbackPlaces(city, query = "", category = "All") {
  const inferred = category === "All" ? categoryFromQuery(query) : category;
  return definitions.filter(([kind]) => inferred === "All" || kind === inferred).map(([kind, name, summary, price], index) => ({
    id: `fallback-${kind.toLowerCase()}`,
    name,
    city,
    address: `Near ${city}`,
    category: kind,
    summary,
    price,
    matchScore: 97 - index * 2,
    providerLinks: providerLinks(city, query || name),
    source: "provider-search",
  }));
}

export async function searchPlaces({ city, query, category }) {
  const params = new URLSearchParams({ city, ...(query ? { query } : {}), ...(category !== "All" ? { category } : {}) });
  try {
    const result = await api.get(`/places/search?${params}`);
    return { ...result, places: result.places?.length ? result.places : fallbackPlaces(city, query, category) };
  } catch {
    return { mode: "preview", places: fallbackPlaces(city, query, category) };
  }
}

