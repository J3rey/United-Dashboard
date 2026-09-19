# Content studio — schedule, reference reel, before/after script

**Date:** 2026-09-19
**Status:** draft, awaiting review
**Mock (visual contract):** [`docs/content/content-studio-mock.html`](../../content/content-studio-mock.html)
(also https://claude.ai/artifact/MKku4V5wmPBL6WvnmMupsA — needs login; the repo file is the one to read)

## Goal

Each content idea becomes a full record: when it posts, the reel it is
modelled on, how my version twists it, and the script (original vs my draft).
The Content tab gets its own post calendar. Web only.

## Decisions

| Question | Decision |
|---|---|
| Where the calendar lives | Inside the Content tab (List / Schedule toggle). Main Calendar tab untouched |
| Platforms | Web only. `mobile/` unchanged; new columns are nullable so it keeps working |
| Reference reel | Stored as a URL, opened in a new tab. **No embed, no metadata fetch** (IG/TikTok embeds are flaky and need third-party scripts) |
| Before/after | Two plain textareas side by side: original transcript, my draft. No diffing |
| Opening an item | Dedicated open button on the row. **Not whole-row click** — idea, pillar, status and notes cells already edit inline on click |
| Scheduling gesture | Drag a chip onto a day (`@dnd-kit/core`, already installed). Drawer date input is the precise/keyboard path. The mock's click-to-arm is a mock shortcut, not built |
| Tests | Add **Vitest** (dev dependency, approved) for pure logic |
| Schema change | Additive, applied via Supabase MCP (fallback: paste SQL in SQL editor) |

Differences from the mock: no creator/view-count line on the reference card
(can't be fetched) — it shows the link's hostname instead; open button instead
of row click; drag instead of click-to-arm.

## Data

New fields on a content item. All optional; empty string / `''` date in app state, `NULL` in DB.

| App field | DB column (`content_items`) | Type |
|---|---|---|
| `postDate` | `post_date` | `date` — app value `'YYYY-MM-DD'` or `''` |
| `refUrl` | `ref_url` | `text` |
| `twist` | `twist` | `text` |
| `origScript` | `orig_script` | `text` |
| `script` | `script` | `text` |

```sql
alter table public.content_items
  add column if not exists post_date   date,
  add column if not exists ref_url     text,
  add column if not exists twist       text,
  add column if not exists orig_script text,
  add column if not exists script      text;
```

No RLS change: existing row policies cover new columns. **Must be applied
before the web build is deployed** — until then, saving a new field errors
(logged, UI keeps the local value, same as today's failure mode).

## Files

| File | Change |
|---|---|
| `src/lib/contentFields.js` | **new** — pure: `rowToContent(row)`, `contentToRow(changes)` (camel↔snake, `''`↔`null`), `monthGrid(year, month)`, `toISODate(y, m, d)`, `refHost(url)`. New file because `db.js` imports the Supabase client and can't be unit-tested without env |
| `src/lib/contentFields.test.js` | **new** — Vitest |
| `src/services/db.js` | `fetchContent`, `insertContentItem`, `updateContentItem` use the mappers |
| `src/state/defaultState.js` | sample items get the new fields; two get example ref/script/date so demo mode shows the feature |
| `src/tabs/Content.jsx` | List/Schedule toggle in toolbar; `Post date` + `Has` (REF/SCR badges + open button) columns; date input in add row; renders drawer + schedule; owns `openId`, `view` |
| `src/tabs/content/ContentDrawer.jsx` | **new** — right slide-over. Content.jsx is 625 lines already |
| `src/tabs/content/ContentSchedule.jsx` | **new** — month grid, Unscheduled tray, Up next |
| `src/index.css` | drawer, schedule, badge styles (from the mock, using existing tokens) |
| `package.json` | `vitest` devDependency, `"test": "vitest run"` |

Both new components take `items`, `pillars`, and the existing
`updateContent(id, field, val)` — no new state plumbing, no new db functions.

## Behaviour

**List.** Existing table, drag-reorder and inline edits unchanged. New columns:
Post date (formatted `Wed, Sep 23`, `—` if none, read-only here) and Has
(`REF` lit when `refUrl`, `SCR` lit when `script`, then an open button
`aria-label="Open <idea>"`). Posted table gets the same columns. Add row gains
an optional date input.

**Drawer.** Title (editable idea), pillar pill, clickable status steps, post
date, notes. With a reference: link input + hostname + Open (new tab,
`rel="noopener noreferrer"`; bare `instagram.com/...` gets `https://`
prefixed; anything not http(s) is not rendered as a link), twist textarea,
then Original | My draft side by side (stacked under 520px). Without: a
single Script box and an "Add a reference reel" button that reveals the
reference block (local UI state; nothing saved until a field has a value).
Text fields keep local state and **commit on blur and on close** (Close
button, overlay click, Escape) — closing must never drop an unsaved edit.
Date and status commit on change. Deleting the open item closes the drawer.

**Schedule.** Month grid for a local `{year, month}`, ‹ Today › nav. Chips are
pillar-coloured; Posted ones dimmed + struck through. Pillar filter applies.
Chips are draggable onto any day → sets `postDate`. Dragging onto the
Unscheduled tray clears it. Clicking a chip opens the drawer (dnd-kit
`PointerSensor` with `distance: 5` so a click is not a drag). Unscheduled tray
lists non-posted items with no date. Up next lists non-posted items dated
today or later, soonest first.

**Dates.** Grid and "today" are built from local `getFullYear/getMonth/getDate`,
never `toISOString()` — a post dated the 23rd must sit on the 23rd in every
timezone. (Deliberate exception to the CLAUDE.md note, which covers existing
code.) `postDate` strings are compared lexically.

## Out of scope

Embeds, thumbnails, auto-transcription, diff view, recurring slots,
notifications, main Calendar tab, mobile screens, pushing to Google Calendar.

## Testing

1. **Vitest** on `contentFields.js`: round-trip mapping incl. `''`↔`null` and
   partial `changes`; `monthGrid` for Sep 2026 (starts Tue, 30 days), a
   Sunday-start month, Feb in a leap year; `toISODate` zero-padding;
   `refHost` / URL normalisation incl. `javascript:` rejected.
2. `npm run build` clean.
3. **Browser E2E in demo mode** (in-memory, touches no real data): add item
   with date → appears in grid; open drawer, type script, close via Escape →
   SCR badge lit and text still there on reopen; add reference → before/after
   appears; drag chip to another day → list date updates; drag to tray →
   unscheduled; filter by pillar in both views; existing inline edits and
   drag-reorder still work; 400px width has no horizontal page scroll.
4. **DB:** after migration, confirm the five columns exist via MCP.
   Signed-in save is covered by the mapper tests + column check; I cannot
   enter your password, so one signed-in smoke (edit a script, reload) is yours.
