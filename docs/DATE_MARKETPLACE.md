# DestinyOne — Events & Date Marketplace

This feature is implemented as a premium MVP preview with mock/curated data and production-ready connection points.

## What is included now

- Real venue database structure: 40+ curated USA/Canada date places across 20+ major cities
- Search and filters for restaurants, cafés, tourist spots, activities, parks, desserts, lounges, and cultural places
- “First date safe near me” style filter for public, staffed, easy-exit locations
- Reservation-ready and premium/community filters
- Date packages: safe café, chai + dessert, museum + coffee, Indian dinner, rooftop table, executive dinner
- Indian community mixers, South Asian professional mixers, video speed dates, hybrid speed dating, premium invite-only dinners
- Partner/reservation readiness pipeline visible inside the app
- Live marketplace operations snapshot for partner CRM, provider adapters, refunds, safety SLA, event capacity, and city coverage
- Launch city roadmap for NYC/NJ, Toronto, Dallas, Bay Area, and Los Angeles
- Tonight-safe picks for quick public/reservable date planning
- Partner intake preview for restaurants/cafés that can later connect to a CRM or partner table
- Reservation + safety operating model covering quote/hold, private acceptance, check-ins, and support handoff
- Date Concierge already supports approximate location, safety check-in, trusted-contact sharing, reservation quote/hold preview, and chat proposals

## Production providers to connect later

- Places data: Google Places, Yelp Fusion, Tripadvisor Content API, or a contracted venue database
- Reservation API: OpenTable, SevenRooms, Resy, Toast, Tock, or custom direct partner inventory
- Event ticketing/capacity: Stripe Checkout, Eventbrite-style provider, or internal event tables
- Safety operations: push notifications, trusted-contact delivery, check-in webhooks, support escalation

## Partner program workflow

1. Shortlist venue and verify it is public, safe, date-appropriate, and accessible.
2. Sign partner agreement with support SLA, refund/cancellation policy, and package menu.
3. Add package inventory: café date, dessert walk, dinner table, premium lounge, hosted dinner.
4. Connect reservation adapter for quote, hold, confirmation, cancellation, and status webhooks.
5. Add safety metadata: public entry, staff visibility, parking/transit notes, no home-address exposure.

## Live marketplace ops gate

The app now separates “preview is built” from “real orders/bookings can be promised.” Before live launch, every launch city needs:

- 3+ qualified venue/restaurant/café leads
- 1 signed partner with a package menu and support contact
- 1 trained event host
- 1 monthly mixer/speed-date/premium dinner plan
- 24+ confirmed seats or reservation capacity
- Connected places + reservation provider
- Server-side payment webhook, refund policy, and cancellation copy
- Staffed safety/support SLA under 24 hours

## Places / Reservation Provider Gate

Admin Audit also includes a focused gate for venue and reservation readiness. It checks:

1. Curated inventory: 40+ safe venues, 20+ cities, search, categories and safe-first-date filters.
2. Live places provider: hours, ratings, photos, maps, closed-place checks and provider attribution.
3. Reservation provider: availability, holds, confirmation, cancellation, no-show and fallback copy.
4. Date packages and partners: package menus, signed venues, cancellation terms and support contact.
5. Safety/location: approximate location only, public-first-date rules and check-in reminders.
6. Payment/refund path: reservation hold webhooks, refund policy and receipt trail.
7. Support operations: venue issue, harassment, no-show, refund and safety escalation flow.
8. Physical-device QA: maps/deep links, denied location, provider downtime, app resume and expired holds.

Current app status: curated places, search, package selection, location consent copy, safety check-ins and reservation preview are represented. Live release still needs provider keys, availability sync, real reservation holds, refund policy, map/deep-link QA and staffed operations.

## Store/release note

The marketplace is preview-ready. Production release still needs live places/reservation provider keys, event capacity management, support SLAs, refund policy, staffed escalation, and physical-device QA before claiming live availability.
