# DestinyOne Couples Marketplace Research

## Product signals

- Eventbrite's USA study of 1,001 people aged 21-35 found that 82% want a first date built around something both people enjoy, 62% of Gen Z respondents prefer a first date under $50, and shared-interest activities such as cooking, dance and painting are strong discovery formats.
- Eventbrite also reported growing demand for in-person dating events, game-based events and athletic events. DestinyOne should combine intentional matching with bookable shared experiences instead of limiting the marketplace to restaurants.
- OpenTable reports continued interest in experiential dining. Dining inventory needs date/time/party-size availability, deposits, table type, cancellation policy and transparent fees.

## Required inventory adapters

| Inventory | Recommended production adapter | DestinyOne responsibility |
| --- | --- | --- |
| City and place discovery | Google Places API (New) | Autocomplete any USA/Canada city, place details, hours, ratings, photos and category filters |
| Restaurant reservations | OpenTable Consumer API v2 or contracted restaurant partners | Availability, slot lock, booking, deposits, cancellation and confirmation |
| Hotels and romantic stays | Expedia Group Rapid Lodging API | Geography, property content, room shopping, price check, booking and manage-booking |
| Tours and experiences | Viator Partner API | Product content, real-time availability, pricing, booking, tickets and post-booking status |
| Events and entertainment | Ticketmaster Discovery/partner APIs plus DestinyOne-hosted inventory | Event discovery, venue/date filters, ticket inventory and checkout |
| Payments | Stripe/Apple Pay/Google Pay server flow | Idempotent payment intents, receipts, refunds, chargebacks and provider reconciliation |

## Coverage model

Static city arrays cannot deliver complete coverage. Production search must use city/postal-code autocomplete and provider geography IDs so every supported USA and Canada locality can resolve dynamically. Curated DestinyOne recommendations should sit on top of provider inventory, not replace it.

## One-checkout requirements

1. Create one itinerary containing stay, dining, experience, event, gifting and transport items.
2. Recheck every item's price and availability server-side before payment.
3. Show taxes, fees, deposits and cancellation rules per item and for the combined order.
4. Use idempotency keys for booking and payment retries.
5. Confirm both members before exposing sensitive hotel or itinerary details.
6. Provide one DestinyOne support case while retaining each provider confirmation ID.
7. Support partial cancellation, provider failure, refunds and itinerary substitutions.

## Current implementation boundary

The app now contains a complete mock planner and checkout flow for product validation. It does not claim to reserve live inventory or charge a real card. Live booking requires provider approval, credentials, Supabase order tables, server-side adapters, payment webhooks and staffed customer support.

## Sources

- https://www.eventbrite.com/blog/press/newsroom/report-singles-online-to-offline-dating-shared-experiences/
- https://www.opentable.com/restaurant-solutions/2025-diner-trends/
- https://docs.opentable.com/
- https://developers.google.com/maps/documentation/places/web-service/place-types
- https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
- https://developers.expediagroup.com/rapid/lodging
- https://developers.expediagroup.com/rapid/lodging/geography/about-geography-api
- https://docs.viator.com/partner-api/
- https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
