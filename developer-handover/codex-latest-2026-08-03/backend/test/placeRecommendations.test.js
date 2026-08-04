import assert from "node:assert/strict";
import test from "node:test";
import { normalizePlaceSearch, previewPlaceSuggestions, providerSearchLinks } from "../src/services/placeRecommendations.js";

test("maps Airbnb language to provider-safe vacation stay search", () => {
  const result = normalizePlaceSearch({ city: "Fresno, CA", query: "romantic Airbnb", category: "Hotel" });
  assert.equal(result.city, "Fresno, CA");
  assert.equal(result.regionCode, "US");
  assert.match(result.textQuery, /vacation stays/i);
  assert.doesNotMatch(result.textQuery, /airbnb/i);
});

test("creates useful fallback suggestions for any city", () => {
  const results = previewPlaceSuggestions("Kelowna, BC", "", "All");
  assert.equal(results.length, 8);
  assert.equal(results[0].city, "Kelowna, BC");
  assert.ok(results.every((place) => place.providerLinks.maps.startsWith("https://")));
});

test("provider links keep lodging providers explicit", () => {
  const links = providerSearchLinks("Fresno, CA", "romantic stay");
  assert.match(links.airbnb, /airbnb\.com/);
  assert.match(links.hotels, /google\.com\/travel/);
});

