import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { normalizePlaceSearch, previewPlaceSuggestions, providerSearchLinks } from "../services/placeRecommendations.js";

const router = Router();
router.use(requireAuth);

const priceLabels = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

router.get("/search", async (request, response, next) => {
  try {
    const normalized = normalizePlaceSearch(request.query);
    if (!normalized.city) return response.status(400).json({ message: "A USA or Canada city is required." });
    const apiKey = String(process.env.GOOGLE_PLACES_API_KEY || "").trim();
    if (!apiKey) {
      return response.json({
        mode: "preview",
        places: previewPlaceSuggestions(normalized.city, request.query.query, normalized.category),
        providerLinks: providerSearchLinks(normalized.city, request.query.query),
        message: "Add GOOGLE_PLACES_API_KEY for live place names, hours and ratings.",
      });
    }

    const body = {
      textQuery: normalized.textQuery,
      pageSize: 12,
      regionCode: normalized.regionCode,
      languageCode: "en",
      ...(normalized.includedType ? { includedType: normalized.includedType } : {}),
      ...(request.query.pageToken ? { pageToken: String(request.query.pageToken).slice(0, 500) } : {}),
    };
    const placesResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.regularOpeningHours.openNow,places.primaryType,nextPageToken",
      },
      body: JSON.stringify(body),
    });
    if (!placesResponse.ok) {
      const providerError = await placesResponse.json().catch(() => ({}));
      return response.status(502).json({ message: providerError?.error?.message || "Live place search is temporarily unavailable." });
    }
    const payload = await placesResponse.json();
    const places = (payload.places || []).map((place) => ({
      id: place.id,
      name: place.displayName?.text || "Local place",
      address: place.formattedAddress || normalized.city,
      city: normalized.city,
      category: normalized.category === "All" ? "Activity" : normalized.category,
      price: priceLabels[place.priceLevel] || "Check price",
      rating: place.rating,
      ratingCount: place.userRatingCount,
      openNow: place.regularOpeningHours?.openNow,
      mapsUrl: place.googleMapsUri,
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
      primaryType: place.primaryType,
      source: "google-places",
    }));
    return response.json({ mode: "live", places, nextPageToken: payload.nextPageToken });
  } catch (error) {
    return next(error);
  }
});

export default router;

