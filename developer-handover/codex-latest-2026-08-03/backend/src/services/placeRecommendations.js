const categoryQueries = {
  All: "romantic date ideas",
  Restaurant: "romantic restaurants",
  Cafe: "quiet coffee shops and chai cafes",
  Hotel: "romantic hotels and vacation stays",
  Wellness: "couples spa and wellness",
  Tourist: "local attractions and romantic places",
  Activity: "date activities comedy classes and games",
  Park: "public parks gardens and walking trails",
  Dessert: "dessert ice cream and bakeries",
  Lounge: "rooftop lounges and wine bars",
  Cultural: "museums art galleries and cultural attractions",
};

const includedTypes = {
  Restaurant: "restaurant",
  Cafe: "cafe",
  Hotel: "hotel",
  Wellness: "spa",
  Tourist: "tourist_attraction",
  Activity: "amusement_center",
  Park: "park",
  Dessert: "dessert_shop",
  Lounge: "bar",
  Cultural: "museum",
};

export function normalizePlaceSearch({ city, query, category = "All" } = {}) {
  const safeCity = String(city || "").trim().slice(0, 100);
  const safeCategory = Object.hasOwn(categoryQueries, category) ? category : "All";
  let safeQuery = String(query || "").trim().slice(0, 120);
  if (/\bairbnb\b/i.test(safeQuery)) safeQuery = safeQuery.replace(/\bairbnb\b/gi, "vacation stays");
  if (!safeQuery) safeQuery = categoryQueries[safeCategory];
  return {
    city: safeCity,
    category: safeCategory,
    textQuery: `${safeQuery} in ${safeCity}`,
    includedType: includedTypes[safeCategory],
    regionCode: /\b(ON|QC|BC|AB|MB|NS|NB|SK|PE|NL)\b/i.test(safeCity) ? "CA" : "US",
  };
}

export function providerSearchLinks(city, query = "romantic date ideas") {
  const terms = encodeURIComponent(`${query} ${city}`.trim());
  const stayCity = encodeURIComponent(String(city || "").trim());
  return {
    maps: `https://www.google.com/maps/search/?api=1&query=${terms}`,
    airbnb: `https://www.airbnb.com/s/${stayCity}/homes`,
    hotels: `https://www.google.com/travel/search?q=${terms}`,
  };
}

export function previewPlaceSuggestions(city, query, category = "All") {
  const normalized = normalizePlaceSearch({ city, query, category });
  const definitions = [
    ["Restaurant", "Top-rated romantic restaurants", "$$", "Dinner matched to cuisine, budget and date style"],
    ["Cafe", "Quiet coffee & chai", "$", "A low-pressure public first meeting"],
    ["Park", "Parks, gardens & sunset walks", "Free", "Easy conversation with a flexible exit"],
    ["Activity", "Fun things to do together", "$$", "Classes, comedy, games and local events"],
    ["Cultural", "Museums, galleries & culture", "$–$$", "Built-in conversation starters"],
    ["Hotel", "Hotels & vacation stays", "$$$", "Compare stays and booking terms before committing"],
    ["Wellness", "Couples spa & wellness", "$$$", "A relaxing shared experience"],
    ["Tourist", "Local gems & weekend trips", "$–$$$", "Fresh attractions around your profile city"],
  ];
  return definitions
    .filter(([kind]) => normalized.category === "All" || normalized.category === kind)
    .map(([kind, name, price, summary], index) => ({
      id: `preview-${kind.toLowerCase()}`,
      name,
      address: `Near ${normalized.city}`,
      city: normalized.city,
      category: kind,
      price,
      summary,
      matchScore: 97 - index * 2,
      source: "provider-search",
      providerLinks: providerSearchLinks(normalized.city, query || categoryQueries[kind]),
    }));
}

export const googleIncludedTypeFor = (category) => includedTypes[category];

