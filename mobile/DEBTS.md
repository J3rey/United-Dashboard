# Debts — mobile (Expo Go) port plan

Port of the web Finance → Debts sub-view (`src/tabs/Debts.jsx`, branch `feat/debts`) to the Expo app. Same Supabase table, same row shape, so web and mobile stay in sync with no extra backend work.

## Scope

A list of money people owe you. Add (who / what / amount), tap **Resolve** to archive, **Reopen** from Archived, swipe to delete. Header shows **Still owed** total. Nothing is written to the ledger or income — debts are their own thing.

Out of scope: "I owe them" direction, reminders, linking a debt to an expense row.

## Data (shared with web)

Table `finance_debts` — created by the SQL in the web feature's hand-off. Row:

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
export type DebtChanges = Partial<Pick<Debt, 'person' | 'detail' | 'amount' | 'resolved' | 'resolvedAt'>>;
```

## Files

Mirrors the Income feature one-for-one — copy its shape, don't invent a new one.

| file | change |
|------|--------|
| `lib/types.ts` | add `Debt`, `DebtChanges`, `DebtRow`, `finance_debts: Table<DebtRow>` in `Database`, `debts: Debt[]` on `AppState` |
| `lib/db.ts` | `fetchDebts`, `insertDebt`, `updateDebt`, `deleteDebt` next to the income block; add `fetchDebts` to `fetchAll` + `debts` to its return |
| `lib/defaultState.ts` | `debts: [...]` — same sample rows as web `defaultState.js` (2 open, 1–2 resolved) so demo mode matches |
| `hooks/useAppData.tsx` | `debts: []` in the empty-user state |
| `hooks/useActions.tsx` | `saveDebt`, `editDebt`, `deleteDebt` (with undo), `resolveDebt(id, resolved)` — same `commit`/`delayedDelete` pattern as `saveIncome` / `deleteIncome`; export them from the returned object |
| `app/(tabs)/finance/debts.tsx` | new screen (Stack child of `finance/_layout.tsx`, `<Page title="Debts" back>`) |
| `app/(tabs)/finance/index.tsx` | one addition: a second quiet `Button label="Debts →"` beside `Income →` in the wide `Stat` action (wrap both in a `View` row). Nothing else on this screen changes |
| `components/sheets/DebtSheet.tsx` | add/edit sheet, cloned from `IncomeSheet.tsx` |
| `__tests__/actions.test.tsx` | add cases for `saveDebt` / `resolveDebt` / `deleteDebt` undo, copying the income cases |

No `nativeDb.ts` work — debts have no ordering, so plain `db.ts` calls are enough.

## Screen — `finance/debts.tsx`

Structure copied from `income.tsx`, with a header stat and two sections instead of month sections.

```
Page "Debts" (back)
  Stat wide  label="Still owed"  value=money(sum of open)  color=green (ink3 when 0)
  SectionList
    section "Open (n)"       rows: person / detail · dateLabel(date)     amount     [Resolve]
    section "Archived (n)"   rows: person struck-through / detail · Resolved dateLabel(resolvedAt)   amount   [Reopen]
                             collapsed by default; header is a Pressable toggle with the rotated chevron Icon (same as FilterSheet)
  Fab "Add debt"  → DebtSheet
  Empty (no open, no archived): EmptyState "Nobody owes you anything" / "Add a debt and it'll sit here until it's paid back."
```

Row = `ReanimatedSwipeable` (delete on swipe, `actions.deleteDebt`) wrapping a `Pressable` that opens `DebtSheet` for edit. Resolve / Reopen is a small `Button tone="quiet"` at the row's right edge — one tap, no sheet, haptic via the existing `commit` path. Row corner-radius logic: same `index===0` / `index===length-1` trick as income rows.

Sorting: open rows oldest-first (so the stalest debt is on top); archived newest-resolved-first.

## Sheet — `DebtSheet.tsx`

Clone `IncomeSheet.tsx`, then:

- fields: **Amount** (decimal-pad, big green right-aligned, autoFocus) → **Who** (`person`) → **What for** (`detail`) → `DateField` (day added)
- drop the salary switch
- `Chip` suggestions from recent distinct `person` values (same `sources.length >= 3` rule)
- primary button: `Add debt` / `Save changes`; edit mode also gets `Delete` (danger) with the same confirm alert
- `save()`: validate `amount > 0 && person.trim()`; `detail` optional

## Actions — `useActions.tsx`

```ts
async function saveDebt(values: Omit<Debt, 'id'>)              // commit + db.insertDebt, swap local id → server id like saveIncome
async function editDebt(id: Id, changes: DebtChanges)           // commit + db.updateDebt
async function resolveDebt(id: Id, resolved: boolean)           // editDebt(id, { resolved, resolvedAt: resolved ? dateString() : null }) + Haptics.selectionAsync()
function deleteDebt(id: Id)                                     // delayedDelete('Debt deleted', …) — 4 s undo toast like income
```

Failure copy: `Couldn't save that debt. Tap to retry.`

## Theme / copy

Use `theme.ts` tokens only (`colors.moss`, `colors.green`, `colors.ink3`, `type.body`, `type.label`, `numbers`). Money through `money()` from `lib/format`. No new colors, no new components.

## Verify

```bash
cd mobile
npm run typecheck
npm test
npm start          # Expo Go: Finance → Debts →, add / resolve / reopen / swipe-delete, pull to refresh
```

Check on web too (`npm run web`) — the `DatePicker.web.tsx` split means the sheet must render on both.

## Order of work

1. types + db + defaultState + useAppData (typecheck passes with nothing rendering yet)
2. actions + tests
3. DebtSheet
4. debts screen + the `Debts →` button
5. run on Expo Go
