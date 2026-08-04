# Actual-code parity and migration contract

The developer delivery contains two clearly separated layers:

1. `frontend/actual-source/` is the complete existing DestinyOne Expo/React Native source of truth. It includes the real 7,100-line `App.tsx`, domain logic, services, tests, assets, and application configuration.
2. `frontend/src/` is the requested Next.js structure. Its homepage hosts the verified Expo web export from `frontend/public/actual-app/`, so the visible product remains identical while screens are incrementally decomposed into Next.js pages and components.

Do not treat generic migration modules as visual approval. When replacing a parity-bridge screen with a native Next.js screen, compare it against `actual-source` and require matching typography, colour tokens, spacing, content, states, and interactions before removing the bridge.

The Express/MySQL backend lives in `backend/`. Production credentials remain environment-owned and are not included.
