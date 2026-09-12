# Mobile shell implementation plan

Initial goal: pass 1 only; sign-in on iPhone Expo Go opens Finance and survives a cold start.
Contract: docs/mobile/mobile-screens.html in the original checkout; decisions: docs/superpowers/specs/2026-09-12-mobile-expo-design.md. This worktree branches from main before those documentation commits.

Constraints: only mobile/ changes; Expo Go SDK 57 (approved current SDK instead of SDK 54); install through npx expo install; same Supabase queries and schema; light-only; Finance, Habits, Content tabs; pushed Settings; 44pt touch minimum; tabular figures; edits in bottom sheets.

- [x] Install Expo, Router, safe areas, fonts, gestures, Reanimated, bottom sheets, AsyncStorage, Supabase, haptics, splash screen, and TypeScript. Install Jest Expo for meaningful auth/data lifecycle tests.
- [x] Copy the exact transparent source logo into assets/logo.png. Configure light icon/splash, Router entry, and Reanimated plugin last.
- [x] Add domain/schema types; copy constants/defaultState and db queries unchanged with types. Keep the habit_logs/content_pillars/content_items table names actually used by db.js.
- [x] Test first: persisted session restore, demo continuation, auth failures, sign-out, and late session responses. Implement one shared auth provider, AsyncStorage-backed client, and foreground refresh.
- [x] Test first: JWT clock-skew retries once after 2s, other failures do not retry, and stale account data cannot return after sign-out. Port useAppData return shape and implement load/error recovery with an 8s gate.
- [x] Build A1–A3, three deliberately empty tabs with gears, demo banner, E1–E2, with the Finance preferences displayed as disabled rows for this shell checkpoint. Preference writes and all later-pass destinations are deferred. Disable destinations belonging to later passes rather than fake functionality.
- [x] Verify typecheck, unit tests, Expo dependency validation, and iOS JS export. Start Metro in Expo Go mode and show QR. Phone acceptance: sign in, see Finance, force-close Expo Go, reopen project, remain signed in; inspect Settings/sign-out.
- [x] Stop and wait for phone checkpoint approval. No pass 2 UI, integration review, or merge before approval.

Passes 2–5 remain in the contract's order: Finance ledger, Habits, Content, Trim.

Local verification: 10 tests pass; TypeScript passes; Expo dependency check passes; iOS Hermes export passes; db runtime and defaultState match the web source exactly after erasing types. Metro serves Expo Go at exp://192.168.1.27:8081. User confirmed the app runs and sign-in/cold-start works on their iPhone; passes 2–5 were then authorized. Review deferred to branch integration; auth changes warrant a review then.

# Passes 2–5 execution plan (approved continuation)

- [ ] Pass 2: add native support queries only where web service lacks operations; shared optimistic state writes and four-second undo; persistent Finance preferences; date/amount/category/split sheet inputs; sticky date ledger and expense sheets/filter. Tests: event-end placement survives inserts, date edits sort stably, failed writes roll back, undo prevents remote deletion, and demo never calls Supabase.
- [ ] Pass 3: Monday week mapping and selected-day writes, goal-met checks, physical-exercise inheritance from Gym as on web; week strip/day swipes, add/action sheets, archive/restore/delete. Tests: Tuesday back-fill maps to Tuesday, boundaries across month/year, auto checks stay distinct.
- [ ] Pass 4: cards and filters, posted collapse, idea/detail/stage/pillar sheets, then drag mode with affected-position writes. Tests: adding inherits filter; reordered subsets retain posted positions; orphaned pillar references remain visible with fallback styling.
- [ ] Pass 5: native income sheets with unsaved-edit confirmation, stored-rate converter, SVG donut/stacked charts, event marker forms, all empty states, haptics and reduced-motion handling. Tests: conversion round trips and large-currency formatting, update payloads contain only changed fields.
- [ ] Final verification: TypeScript, all meaningful unit tests, Expo dependency validation, iOS Hermes export, service-runtime comparison, and changed-file scope check. Metro remains running for phone acceptance. No browser/computer E2E or automated real-account writes. Native layout, drag feel, and live cross-client sync require the iPhone checkpoint.

New files are limited to mobile routes, native components, state hooks, and tests needed for the contract. Existing web runtime is untouched. Review occurs once at integration; no merge requested at this checkpoint.

Current continuation checks: 27 unit tests pass; TypeScript passes; online Expo dependency validation passes; iOS Hermes export passes. Finance, Habits, Content, income, converter, insights and event forms are implemented. Settings’ Open on choices await the user’s answer; the row is deliberately disabled until that decision. New native support queries leave the original service queries unchanged. No live account mutations or phone UI automation were performed.

# Approved Home Screen web adaptation

Goal: reuse the approved mobile screens as a Vercel-hosted standalone Home Screen web app, without changing the root Vite app or Supabase schema. Expo Go remains supported.

- [ ] Configure Expo single-page web output and Vercel routing; add manifest, viewport/Apple metadata and branded install icons under mobile/public. These files are required for standalone Home Screen launch.
- [ ] Add SDK-compatible react-native-web. Split the date picker and confirmation alerts into native/web implementations; preserve every existing native query and screen.
- [ ] Verify browser export, native export, strict types, existing logic tests and web confirmation behavior. No browser UI automation without approval.
- [ ] Deploy a separate Vercel mobile project and verify HTTP routes, manifest and icons. Login/account access may require the user.
