# Mobile content studio — schedule, reference reel, before/after script

**Date:** 2026-09-29
**Status:** approved (design + mockups)
**Mockups (visual contract):** https://claude.ai/artifact/4YoSDyZSaACKyDEh3Z3yJy (needs login) — List view,
Schedule view, Add-to-this-day sheet, Idea page with/without reference, Post date sheet.
**Web counterpart:** [2026-09-19-content-studio-design.md](2026-09-19-content-studio-design.md)

## Goal

Bring the Expo app's Content tab (`mobile/`) up to the web Content studio: post date,
reference reel + twist, original vs my-draft script, and a schedule. Same data, mobile-native UX.

## Decisions

| Question | Decision |
|---|---|
| Scope | Content tab only. Web app, other mobile tabs untouched |
| Schema | None. The five columns already exist (web migration) |
| Idea detail | Full-screen pushed route `content/[id]`, replaces `IdeaDetailSheet` |
| Schedule gesture | No drag. Month grid + selected-day list; dates set via "Add to this day" sheet or the idea page's Post date row |
| Schedule clutter | No pillar chips, no FAB, no boxed calendar card, compact rows, Unscheduled collapsed |
| Web's "Up next" list | Dropped — grid + day list cover it |
| Before/after | One text box with an `Original \| My draft` toggle (side-by-side doesn't fit) |
| Dependencies | None new |
| Tests | Jest for pure logic; typecheck; iOS export; browser visual pass of the Expo web build in demo mode (approved) |

## Data

`ContentItem` gains `postDate`, `refUrl`, `twist`, `origScript`, `script` — all `string`, `''` when empty.
`postDate` is `'YYYY-MM-DD'` or `''`. DB columns `post_date`, `ref_url`, `twist`, `orig_script`, `script`
are nullable; `''` ↔ `NULL`.

`lib/content.ts` gains (pure, tested):
- `rowToContent(row)` / `contentChangesToRow(changes)` — camel↔snake, `''`↔`null` for the five new fields, only keys present in `changes`.
- `monthGrid(year, month)` — Sunday-start ISO dates, padded with neighbouring-month days to whole weeks (same as web).
- `refHref(url)` / `refHost(url)` — bare `instagram.com/…` gets `https://`; anything not http(s) or containing whitespace → `''`. Uses `new URL` in a try (no `URL.canParse` reliance on Hermes).
- `itemsOn(items, iso)` — items with that `postDate`, pipeline order kept.
- `unscheduled(items)` — non-Posted items with no `postDate`.

`lib/db.ts`: `fetchContent` uses `rowToContent`; `insertContentItem` writes the new columns;
`updateContentItem` uses `contentChangesToRow`. `ContentRow` type gains the nullable columns.
`lib/defaultState.ts` content items mirror web `src/state/defaultState.js` (DITL3, explore more things,
life comes in waves carry example dates/ref/scripts).

Local dates only: "today" and the grid come from `getFullYear/getMonth/getDate` (`dateString()` in `lib/format.ts`), never `toISOString()`.

## Screens

### List view (`app/(tabs)/content/index.tsx`)
- Segmented `List | Schedule` control under the header (local state; survives pushing the idea page).
- List: unchanged pillar chips, reorder, swipe-delete, Posted collapse, FAB.
- `IdeaCard` gains a meta row when any apply: calendar icon + `dateLabel(postDate)`, then right-aligned `REF` (refUrl) / `SCR` (script) tags.
- Tapping a card pushes `/content/<id>`. `IdeaDetailSheet` is removed.

### Schedule view (new `components/ContentSchedule.tsx`)
- Header actions in this view: filter icon (opens a pillar-chip sheet; same `contentFilter` state), pillars, settings. No reorder icon, no FAB, no chips row. When a filter is active, the existing "N ideas in <pillar> · Clear" line shows under the toggle.
- Month header: `September` bold + year muted, ‹ › icon buttons, `Today` text button (selects today, jumps to its month).
- 7-col grid on the page background (no card). Cells ≥44pt: day number, up to 3 pillar-coloured dots (Posted = hollow ring), `+N` beyond 3. Outside-month days dimmed; tapping one selects it and switches month. Today: moss ring. Selected: filled moss circle. Default selection: today.
- Below: `<dateLabel(selected, false)>` heading + "N ideas"; one grouped card of compact rows (pillar dot, idea, stage badge, chevron → idea page); last row `+ Add to this day`.
- `Unscheduled · N` single row, collapsed by default; expands to compact rows.
- Pillar filter applies to dots, day list and unscheduled.
- Pull-to-refresh like the list.

### Add to this day sheet
Title `Add to <date>`, subtitle "Pick an unscheduled idea, or start a new one." Rows of unscheduled ideas
(filtered); tap sets `postDate` and closes. Empty → short copy. Quiet button `New idea for this day` opens
`AddIdeaSheet` with `postDate` preset (its subtitle shows the date).

### Idea page (new route `app/(tabs)/content/[id].tsx`)
- `Page` with `back`, title "Idea", trash action → confirm alert → `deleteIdea` (4s undo toast) → back.
- Item looked up by `String(c.id) === id`; if missing (deleted, or reload) → back.
- Borderless multiline title input (22pt semibold). Empty on blur reverts.
- Stage bar (5 segments) + stage chip → existing `StageSheet` (exported). Stays on page after change.
- Grouped rows: `Pillar ›` (pillar-chip picker sheet), `Post date ›` (value or "None").
- Post date sheet: `DatePicker` (native spinner / web input) seeded with `postDate || today`; primary `Set <date>` commits; `Clear date` (only when set) commits `''`.
- Notes textarea.
- Reference section shown when `refUrl || twist || origScript` or after tapping dashed `+ Add a reference reel` (sub-copy "Unlocks original vs my draft"; local state, nothing saved until a field has text): Link input; when `refHref` valid, hostname + `Open ↗` (`Linking.openURL`); "The twist · how mine differs" textarea.
- Script: with reference, `Original | My draft` segmented toggle (default My draft) over one tall textarea bound to `origScript`/`script`; without, one "Script" textarea (`script`).
- Primary `Mark as <next stage>` at the bottom (absent when Posted).
- Inputs are plain RN `TextInput` with `ui.input` style (not `Field`, which is a bottom-sheet input on native). ScrollView with `keyboardShouldPersistTaps="handled"` and `automaticallyAdjustKeyboardInsets`.
- Saving: text fields keep a local draft; commit changed fields only via `actions.editIdea` on blur and on leaving (navigation `beforeRemove`/unmount). Leaving must never drop an edit. Stage, pillar, date commit immediately.

## Files

| File | Change |
|---|---|
| `mobile/lib/types.ts` | `ContentItem`, `ContentRow`, `ContentChanges` gain the fields |
| `mobile/lib/content.ts` | mappers, grid, ref, selectors |
| `mobile/lib/db.ts` | content fetch/insert/update use mappers |
| `mobile/lib/defaultState.ts` | demo content mirrors web |
| `mobile/__tests__/content.test.ts` | new logic tests |
| `mobile/components/IdeaCard.tsx` | meta row |
| `mobile/components/Icon.tsx` | `calendar`, `external`, `down` icons |
| `mobile/components/sheets/ContentSheets.tsx` | remove `IdeaDetailSheet`; export `StageSheet`; add `PillarPickerSheet`, `PostDateSheet`, `AddToDaySheet`, `PillarFilterSheet`; `AddIdeaSheet` takes optional `postDate` |
| `mobile/components/ContentSchedule.tsx` | **new** — schedule view (keeps `index.tsx` readable) |
| `mobile/app/(tabs)/content/[id].tsx` | **new** — idea page route |
| `mobile/app/(tabs)/content/index.tsx` | toggle, schedule, route push |

## Out of scope
Drag-to-schedule, Up next list, embeds/thumbnails, web app changes, other tabs, notifications.

## Testing
1. Jest: mapper round-trip incl. `''`↔`null` and partial changes; `monthGrid` Sep 2026 (starts Tue → 35 cells, first `2026-08-30`), a Sunday-start month, Feb 2028; `refHref`/`refHost` incl. bare host, `javascript:` and whitespace rejected; `itemsOn` / `unscheduled` (Posted excluded).
2. `npm run typecheck`, `npm test`, iOS export (`npx expo export --platform ios`).
3. Browser visual pass (approved): Expo web build, demo mode, phone viewport — list, schedule, add-to-day, idea page with/without ref, post date sheet vs mockups; add → schedule → open → edit script → back keeps text.
4. Phone check on device is the user's.
