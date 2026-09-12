# Mobile app — Expo, design decisions

**Date:** 2026-09-12
**Status:** approved, not yet implemented
**Mocks + full per-screen spec:** [`docs/mobile/mobile-screens.html`](../../mobile/mobile-screens.html)
(also published at https://claude.ai/code/artifact/190613e6-1c0c-4839-862c-8e01ac952083 — that link needs a login, so the file in this repo is the one to read)

That file is the implementation contract: 35 screens at 390×844, each
with its `expo-router` route, React Native components, libraries, behaviour and
copy. This file records *why*, so the decisions survive without the link.

## Decisions

| Question | Decision |
|---|---|
| Platform | React Native via **Expo**, runnable in **Expo Go** (no dev build) |
| Location | `mobile/` in this repo, own `package.json`. Web app at root untouched |
| Backend | Same Supabase project, **no schema change** |
| Tabs | Finance, Habits, Content. Settings is pushed, not a tab |
| Calendar | **Dropped on mobile.** Web keeps it |
| First screen | Sign-in. Minimal — two fields, one button, one way out |
| Habits | One day at a time, not the 7×N grid. Week strip above for back-fill |
| Charts | `react-native-gifted-charts` (svg-only) |
| Dark mode | Out of scope. Light-only, matching web |

### Why no calendar

Seven columns of a time grid do not fit 390pt, and the phone would inherit the
whole Google Calendar OAuth surface (`expo-auth-session`, token refresh,
`useGoogleCalendar`'s 305 lines) for a view that reads worse than the native
Calendar app. Dropping it removes the largest chunk of the port.

### Why one day at a time for habits

The web grid needs `name + 7 cells + progress` on one row. At 390pt that leaves
~36pt cells — under the 44pt touch floor — and an unreadable name column. Weekly
goals are still the model, so the week strip lets a missed Tuesday be ticked on
Saturday and counted for Tuesday.

### Why Expo Go constrains the deps

Expo Go can't load custom native modules. That rules out
`victory-native` v40+ and `@shopify/react-native-skia`. `react-native-svg`,
`reanimated`, `gesture-handler` and `@gorhom/bottom-sheet` all ship with the SDK.

## Port as-is, don't rewrite

`src/services/db.js` and `src/constants/index.js` are platform-free — copy them,
add types, leave the queries alone. They are the contract the web app also
depends on. Same for the `useAppData` shape and the `JWT issued at future`
retry from commit `3b00f96`.

Native additions: `createClient` needs `{ auth: { storage: AsyncStorage,
persistSession: true, detectSessionInUrl: false } }` or every cold start signs
the user out.

## Does not port

`prompt()` cell editing, `contentEditable` habit renaming,
`document.createElement` HTML stripping, `localStorage`, `@dnd-kit/*`,
`chart.js`. Each has a named replacement in the artifact.

## Three rules that govern every screen

1. A row never edits in place — tapping it opens a bottom sheet.
2. Everything tappable clears 44×44pt.
3. Every figure uses `fontVariant: ['tabular-nums']`.

## Open question

Dark mode is assumed out of scope. Confirm before build — it turns every token
in `theme.ts` from a constant into a pair.
