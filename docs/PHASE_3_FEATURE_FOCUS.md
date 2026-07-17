# Phase 3: feature focus

Last verified: 2026-07-15

## Product hierarchy

DestinyOne now prioritizes one serious-relationship journey:

1. Receive a qualified introduction in Matches.
2. Express mutual interest and start a meaningful conversation in Chat.
3. Propose and accept a real date in Dates.
4. Record private reflection and consented outcome feedback.

The persistent navigation has exactly five destinations: Matches, Discover,
Chat, Dates, and Profile. This keeps the core loop visible without turning the
home screen into a catalogue.

## Discover hub

Discover is the supporting-tools home. Executive Circle remains a prominent,
first-viewport destination for members seeking selective professional
introductions. People who chose you, match preferences, Relationship Coach,
Trusted Circle, and trust and verification are reachable here without
competing with daily matches.

Gifts, GIFs, games, and other playful extras remain inside Chat after a mutual
connection. They are not primary navigation destinations.

## Evidence

- Navigation and feature tiers are defined in `src/domain/featureFocus.ts`.
- Automated tests enforce five stable tabs, core feature reachability, and the
  Chat-only boundary for delight features.
- Matches and Discover were visually checked at 390x844, 768x1024, and
  1440x900 web viewports.
- Executive Circle, likes, and match preferences were click-tested in mock
  mode from Discover.

## Focus enforcement update

- Added a four-step `Meet → Align → Talk → Plan` relationship rail to Discover so supporting tools remain anchored to the core outcome.
- Reduced the first Chat attachment page from eight equal-weight actions to six high-frequency actions: Date, Camera, Gallery, Location, Document and More.
- Moved Contact, Poll, GIF, Gift, Games, Snap, Face, Spark and disappearing messages behind the intentional More layer without removing functionality.
- Made feature-surface budgets explicit in the domain model for primary navigation, Home, Explore, Chat toolbar, primary attachments, secondary attachments and profile operations.
- Added automated protection against duplicate primary attachment actions and surface-budget overflow.
- Expanded the focus suite from three to six tests; the complete product suite now contains 272 tests across 67 files.

## Production gates still open

- Production feature flags and remote rollback are not connected.
- Funnel analytics are not yet collected from real members.
- Target South Asian members in launch cities have not validated the hierarchy.
- Mock-only actions must be removed or clearly labelled before a production
  release.

This phase is a functional local product-focus improvement, not proof that the
funnel has reached product-market fit.
