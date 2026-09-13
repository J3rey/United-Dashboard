# Debts — mobile (Expo Go) brief

Port of the web Finance → Debts sub-view (`src/tabs/Debts.jsx`, branch `feat/debts`) to the Expo app. Mocks and per-screen spec are **B13 Debts, B14 Add debt, B15 Edit debt** in `docs/mobile/mobile-screens.html` — open it in a browser, read those three blocks first. This file is the file-level plan.

Same Supabase table as web, same row shape, no backend work.

## Scope

A list of money people owe you. Add (who / what for / amount / date), edit every one of those fields later, swipe right to **Resolve** (moves to Archived) or **Reopen**, swipe left to delete. Header shows **Still owed**. Nothing is written to the ledger or income.

Out of scope: "I owe them" direction, reminders, linking a debt to an expense row.

## Data (shared with web)

Table `finance_debts`:

| column        | type                 |
|---------------|----------------------|
| `id`          | uuid                 |
| `user_id`     | uuid → auth.users    |
| `date`        | date (day added)     |
| `person`      | text                 |
| `detail`      | text                 |
| `amount`      | numeric              |
| `resolved`    | bool                 |
| `resolved_at` | date, nullable       |
| `created_at`  | timestamptz          |

App-side type (matches web `state.debts`):

```ts
export type Debt = { id: Id; date: string; person: string; detail: string; amount: number; resolved: boolean; resolvedAt: string | null };
export type DebtChanges = Partial<Pick<Debt, 'date' | 'person' | 'detail' | 'amount' | 'resolved' | 'resolvedAt'>>;
```

## Files

Mirrors the Income feature one-for-one — copy its shape, don't invent a new one.

| file | change |
|------|--------|
| `lib/types.ts` | add `Debt`, `DebtChanges`, `DebtRow`, `finance_debts: Table<DebtRow>` in `Database`, `debts: Debt[]` on `AppState` |
| `lib/db.ts` | `fetchDebts`, `insertDebt`, `updateDebt`, `deleteDebt` next to the income block (`resolvedAt ↔ resolved_at` mapping here); add `fetchDebts` to `fetchAll` + `debts` to its return |
| `lib/defaultState.ts` | `debts: [...]` — same sample rows as web `defaultState.js` (3 open, 2 resolved) so demo mode matches the mock |
| `hooks/useAppData.tsx` | `debts: []` in the empty-user state |
| `hooks/useActions.tsx` | `saveDebt`, `editDebt`, `deleteDebt` (with undo), `resolveDebt(id, resolved)` — same `commit`/`delayedDelete` pattern as `saveIncome` / `deleteIncome`; export from the returned object |
| `app/(tabs)/finance/debts.tsx` | new screen (Stack child of `finance/_layout.tsx`, `<Page title="Debts" back>`) — B13 |
| `app/(tabs)/finance/index.tsx` | one addition: a second quiet `Button label="Debts →"` beside `Income →` in the wide `Stat` action (wrap both in a `View` row). Nothing else on this screen changes |
| `components/sheets/DebtSheet.tsx` | add/edit sheet, cloned from `IncomeSheet.tsx` — B14 / B15 |
| `__tests__/actions.test.tsx` | cases for `saveDebt` / `editDebt` / `resolveDebt` / `deleteDebt` undo, copying the income cases |

No `nativeDb.ts` work — debts have no ordering.

## Screen — `finance/debts.tsx` (B13)

```
Page "Debts" (back)
  Stat wide  label="Still owed"  value=money(sum of open)  color=green (ink3 when 0)   right: "n open"
  SectionList
    "Open"           rows: person / detail · dateLabel(date)                      amount green
    "Archived (n)"   rows: person struck-through ink3 / detail · Resolved dateLabel(resolvedAt)   amount ink3
                     collapsed by default; header is a Pressable with the rotated chevron Icon (same as FilterSheet)
  Fab "Add debt" → DebtSheet
  Empty (no open AND no archived): EmptyState "Nobody owes you anything" / "Add a debt and it'll sit here until it's paid back." action "Add debt"
```

Row = `ReanimatedSwipeable` wrapping a `Pressable` (tap → `DebtSheet` edit).
- `renderLeftActions` → moss `Button label="Resolve"` (or `"Reopen"` in Archived) → `actions.resolveDebt(id, !resolved)`. Check icon, no sheet.
- `renderRightActions` → danger `Button label="Delete"` → `actions.deleteDebt(id)`.
- Corner-radius: same `index===0` / `index===length-1` trick as income rows.

Sorting: open oldest-first (stalest on top); archived newest-`resolvedAt`-first.

## Sheet — `DebtSheet.tsx` (B14 add, B15 edit)

Clone `IncomeSheet.tsx`, then:

- fields, in order: **Amount** (decimal-pad, big green right-aligned, autoFocus) → **Who** (`person`) → **What for** (`detail`, placeholder "Optional") → `DateField` (day added, default today)
- drop the salary switch
- `Chip` suggestions of recent distinct `person` values under **Who** (same `>= 3` rule as income sources)
- add mode: title "New debt", primary `Add debt`
- edit mode: title = person, subline "Added {dateLabel(date)}" or "Resolved {dateLabel(resolvedAt)}" if archived; all four fields prefilled and editable; `Delete` (danger, confirm alert) + `Save changes`; a quiet link button below: `Mark resolved` / `Reopen` → `resolveDebt`, closes sheet
- `save()`: validate `amount > 0 && person.trim()`; `detail` optional; round amount to cents
- dismiss with pending edits saves them (existing sheet behaviour)

## Actions — `useActions.tsx`

```ts
async function saveDebt(values: Omit<Debt, 'id'>)              // commit + db.insertDebt, swap local id → server id like saveIncome
async function editDebt(id: Id, changes: DebtChanges)           // commit + db.updateDebt, only changed keys
async function resolveDebt(id: Id, resolved: boolean)           // editDebt(id, { resolved, resolvedAt: resolved ? dateString() : null }) + Haptics.selectionAsync()
function deleteDebt(id: Id)                                     // delayedDelete('Debt deleted', …) — 4 s undo toast like income
```

Failure copy: `Couldn't save that debt. Tap to retry.`

## Theme / copy

`theme.ts` tokens only (`colors.moss`, `colors.green`, `colors.ink3`, `type.body`, `type.subtitle`, `type.label`, `numbers`). Money through `money()` from `lib/format`, dates through `dateLabel()`. No new colors, no new components.

## Verify

```bash
cd mobile
npm run typecheck
npm test
npm start          # Expo Go: Finance → Debts →, add / edit / swipe-resolve / reopen / swipe-delete + undo, pull to refresh
```

Check on web too (`npm run web`) — the `DatePicker.web.tsx` split means the sheet must render on both.

## Order of work

1. types + db + defaultState + useAppData (typecheck passes with nothing rendering yet)
2. actions + tests
3. DebtSheet
4. debts screen + the `Debts →` button
5. run on Expo Go
