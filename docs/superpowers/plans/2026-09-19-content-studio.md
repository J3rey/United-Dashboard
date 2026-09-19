# Content Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each content idea a post date, reference reel link, twist note and original-vs-draft script, with a drawer to edit them and a month schedule inside the Content tab.

**Architecture:** Five new optional fields on content items, mapped camel↔snake by pure functions in `src/lib/contentFields.js` (unit-tested), consumed by `db.js`. `Content.jsx` keeps owning state and the single `updateContent(id, field, val)` writer; two new presentational components (`ContentDrawer`, `ContentSchedule`) receive items + that callback.

**Tech Stack:** Vite, React 18, `@dnd-kit/core` (installed), Supabase JS, Vitest (new dev dep, approved).

**Spec:** `docs/superpowers/specs/2026-09-19-content-studio-design.md` — read it. **Visual contract:** `docs/content/content-studio-mock.html`.

## Global Constraints

- Branch `content-studio`. One commit per task. End commit messages with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Web only. Do not touch `mobile/`, `src/tabs/Calendar.jsx`, or any tab other than Content.
- No dependencies beyond `vitest`.
- Scope discipline: no refactors, renames, reformatting or import reordering of existing code. Three duplicated `<colgroup>` blocks in `Content.jsx` stay duplicated — edit each.
- All new CSS classes are prefixed `cs-` (the app already has global `.day`, `.modal`, `.panel`, calendar classes — do not collide). Use existing CSS variables; the app is light-only, add no dark theme.
- App field names, exact: `postDate` (`'YYYY-MM-DD'` or `''`), `refUrl`, `twist`, `origScript`, `script`. DB columns: `post_date`, `ref_url`, `twist`, `orig_script`, `script`.
- Never use `toISOString()` for post dates; use `toISODate` / `todayISO` from `contentFields.js`.
- Item ids may be numbers (demo) or UUID strings (Supabase). Compare with `String(a) === String(b)` (Content.jsx already has `sameId`).
- No speculative try/catch. No TODOs or stubs.
- Verification per task: `npm test` and `npm run build` both clean.

---

### Task 1: Vitest + pure content helpers

**Files:**
- Modify: `package.json`
- Create: `src/lib/contentFields.js`
- Test: `src/lib/contentFields.test.js`

**Interfaces — Produces** (month is 0-based like `Date`):
- `rowToContent(row) → { id, idea, pillarId, status, notes, postDate, refUrl, twist, origScript, script }`
- `contentToRow(changes) → object` — only keys present in `changes`, snake_case; `''` → `null` for the five new fields only
- `toISODate(year, month, day) → 'YYYY-MM-DD'`
- `todayISO(now = new Date()) → 'YYYY-MM-DD'` (local)
- `monthGrid(year, month) → Array<string|null>` — flat, length multiple of 7, Sunday-first, `null` = padding
- `formatPostDate(iso) → 'Wed, Sep 23'`
- `refHref(url) → string` — normalised http(s) URL or `''`
- `refHost(url) → string` — hostname without `www.` or `''`

- [ ] **Step 1: Install Vitest and add script**

Run: `npm install -D vitest`
In `package.json` scripts add: `"test": "vitest run"`

- [ ] **Step 2: Write the failing tests** — `src/lib/contentFields.test.js`

```js
import { describe, it, expect } from 'vitest'
import {
  rowToContent, contentToRow, toISODate, todayISO, monthGrid,
  formatPostDate, refHref, refHost,
} from './contentFields.js'

describe('rowToContent', () => {
  it('maps a full row', () => {
    expect(rowToContent({
      id: 'u1', idea: 'waves', pillar_id: 'p4', status: 'Scripted', notes: 'n',
      post_date: '2026-09-23', ref_url: 'https://x.com/r', twist: 't',
      orig_script: 'o', script: 's', user_id: 'z', sort_order: 3,
    })).toEqual({
      id: 'u1', idea: 'waves', pillarId: 'p4', status: 'Scripted', notes: 'n',
      postDate: '2026-09-23', refUrl: 'https://x.com/r', twist: 't',
      origScript: 'o', script: 's',
    })
  })
  it('turns nulls and missing columns into empty strings', () => {
    const c = rowToContent({ id: 1, idea: 'a', pillar_id: 2, status: 'Idea', notes: null })
    expect(c).toMatchObject({ notes: '', postDate: '', refUrl: '', twist: '', origScript: '', script: '' })
  })
})

describe('contentToRow', () => {
  it('maps only the keys given', () => {
    expect(contentToRow({ script: 'hello' })).toEqual({ script: 'hello' })
    expect(contentToRow({ pillarId: 5, origScript: 'o' })).toEqual({ pillar_id: 5, orig_script: 'o' })
  })
  it('sends null for cleared new fields but keeps empty notes as empty string', () => {
    expect(contentToRow({ postDate: '', refUrl: '', notes: '' }))
      .toEqual({ post_date: null, ref_url: null, notes: '' })
  })
  it('ignores unknown keys', () => {
    expect(contentToRow({ id: 1, bogus: 2, idea: 'x' })).toEqual({ idea: 'x' })
  })
  it('round-trips', () => {
    const item = { idea: 'a', pillarId: 1, status: 'Idea', notes: '', postDate: '2026-01-05', refUrl: '', twist: '', origScript: '', script: 's' }
    expect(rowToContent({ id: 9, ...contentToRow(item) })).toEqual({ id: 9, ...item })
  })
})

describe('dates', () => {
  it('zero-pads', () => expect(toISODate(2026, 0, 5)).toBe('2026-01-05'))
  it('todayISO uses local parts', () => {
    expect(todayISO(new Date(2026, 8, 19, 23, 59))).toBe('2026-09-19')
    expect(todayISO(new Date(2026, 8, 19, 0, 1))).toBe('2026-09-19')
  })
  it('Sep 2026 starts on Tuesday with 30 days', () => {
    const g = monthGrid(2026, 8)
    expect(g.length).toBe(35)
    expect(g.slice(0, 3)).toEqual([null, null, '2026-09-01'])
    expect(g[31]).toBe('2026-09-30')
    expect(g.slice(32)).toEqual([null, null, null])
  })
  it('Nov 2026 starts on Sunday', () => {
    const g = monthGrid(2026, 10)
    expect(g[0]).toBe('2026-11-01')
    expect(g.length % 7).toBe(0)
  })
  it('handles leap February', () => {
    const g = monthGrid(2028, 1)
    expect(g).toContain('2028-02-29')
    expect(g).not.toContain('2028-02-30')
    expect(g.length % 7).toBe(0)
  })
  it('formats a post date', () => expect(formatPostDate('2026-09-23')).toBe('Wed, Sep 23'))
})

describe('reference url', () => {
  it('prefixes bare domains', () => {
    expect(refHref('instagram.com/reel/abc')).toBe('https://instagram.com/reel/abc')
    expect(refHost('instagram.com/reel/abc')).toBe('instagram.com')
  })
  it('keeps http(s) and strips www from host', () => {
    expect(refHref('  https://www.tiktok.com/@a/video/1 ')).toBe('https://www.tiktok.com/@a/video/1')
    expect(refHost('https://www.tiktok.com/@a/video/1')).toBe('tiktok.com')
  })
  it('rejects non-http schemes and junk', () => {
    expect(refHref('javascript:alert(1)')).toBe('')
    expect(refHref('data:text/html,hi')).toBe('')
    expect(refHref('')).toBe('')
    expect(refHost('not a url')).toBe('')
  })
})
```

- [ ] **Step 3: Run, verify failure** — `npm test` → FAIL (module not found).

- [ ] **Step 4: Implement** — `src/lib/contentFields.js`

```js
const FIELD_TO_COLUMN = {
  idea: 'idea',
  pillarId: 'pillar_id',
  status: 'status',
  notes: 'notes',
  postDate: 'post_date',
  refUrl: 'ref_url',
  twist: 'twist',
  origScript: 'orig_script',
  script: 'script',
}
const NULL_WHEN_EMPTY = new Set(['postDate', 'refUrl', 'twist', 'origScript', 'script'])

export function rowToContent(row) {
  return {
    id: row.id,
    idea: row.idea,
    pillarId: row.pillar_id,
    status: row.status,
    notes: row.notes ?? '',
    postDate: row.post_date ?? '',
    refUrl: row.ref_url ?? '',
    twist: row.twist ?? '',
    origScript: row.orig_script ?? '',
    script: row.script ?? '',
  }
}

export function contentToRow(changes) {
  const row = {}
  for (const [field, column] of Object.entries(FIELD_TO_COLUMN)) {
    if (!(field in changes)) continue
    const val = changes[field]
    row[column] = NULL_WHEN_EMPTY.has(field) && val === '' ? null : val
  }
  return row
}

const pad = n => String(n).padStart(2, '0')

export function toISODate(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

export function todayISO(now = new Date()) {
  return toISODate(now.getFullYear(), now.getMonth(), now.getDate())
}

export function monthGrid(year, month) {
  const lead = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const cells = Array(lead).fill(null)
  for (let d = 1; d <= days; d++) cells.push(toISODate(year, month, d))
  while (cells.length % 7) cells.push(null)
  return cells
}

export function formatPostDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function parseRef(url) {
  const raw = url.trim()
  if (!raw || /\s/.test(raw)) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
  if (!URL.canParse(withScheme)) return null
  const parsed = new URL(withScheme)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  return { href: withScheme, host: parsed.hostname.replace(/^www\./, '') }
}

export function refHref(url) {
  return parseRef(url)?.href ?? ''
}

export function refHost(url) {
  return parseRef(url)?.host ?? ''
}
```

- [ ] **Step 5: Run** — `npm test` → all PASS. `npm run build` → clean.

- [ ] **Step 6: Commit** — `git add package.json package-lock.json src/lib && git commit -m "feat(content): add content field mappers and schedule helpers"`

---

### Task 2: Persist the new fields

**Files:**
- Modify: `src/services/db.js` (Content section, ~lines 217–260)
- Modify: `src/state/defaultState.js` (`content` array)
- Modify: `src/tabs/Content.jsx` (`addContentRow` only)

**Interfaces — Consumes:** `rowToContent`, `contentToRow` from `src/lib/contentFields.js`.
**Produces:** every item in `state.content` has all five new fields as strings; `db.updateContentItem(id, { postDate|refUrl|twist|origScript|script })` persists; `db.insertContentItem(userId, item, sortOrder)` persists `item.postDate`.

- [ ] **Step 1: `db.js`** — add `import { rowToContent, contentToRow } from '../lib/contentFields.js'` beside the existing imports. Then:

In `fetchContent` replace the `const content = ...map(...)` line with:
```js
  const content = (itemsData ?? []).map(rowToContent)
```
In `insertContentItem` replace the `.insert({...})` argument with:
```js
    .insert({ user_id: userId, sort_order: sortOrder, ...contentToRow(item) })
```
Replace the whole body of `updateContentItem` with:
```js
export async function updateContentItem(id, changes) {
  const { error } = await supabase.from('content_items').update(contentToRow(changes)).eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 2: `defaultState.js`** — every `content` entry gets `postDate: '', refUrl: '', twist: '', origScript: '', script: ''`. Then give three entries example data (demo mode must show the feature; text is from the mock):
  - id 10 `life comes in waves`: `status: 'Scripted'`, `postDate: '2026-09-23'`, `refUrl: 'https://instagram.com/reel/EXAMPLE1'`, and the `twist`, `origScript`, `script` strings copied verbatim from item id 10 in `docs/content/content-studio-mock.html` (mock's `orig` → `origScript`).
  - id 4 `DITL3`: `postDate: '2026-09-21'`, `script` copied from mock item id 4.
  - id 7 `explore more things`: `postDate: '2026-09-28'`.

- [ ] **Step 3: `Content.jsx` `addContentRow`** — the item literal becomes:
```js
    const item = { idea: newIdea.trim(), pillarId, status: newStatus, notes: newNotes, postDate: newDate, refUrl: '', twist: '', origScript: '', script: '' }
```
Add state next to the other add-form state: `const [newDate, setNewDate] = useState('')`, and `setNewDate('')` with the other resets at the end of `addContentRow`. (The date input itself is added in Task 3.)

- [ ] **Step 4: Verify** — `npm test` PASS, `npm run build` clean.

- [ ] **Step 5: Commit** — `git commit -am "feat(content): persist post date, reference and script fields"`

---

### Task 3: List columns + drawer

**Files:**
- Create: `src/tabs/content/ContentDrawer.jsx`
- Modify: `src/tabs/Content.jsx`
- Modify: `src/index.css` (append at end of the Content section, before the `.modal-overlay` rules)

**Interfaces — Consumes:** `formatPostDate`, `refHref`, `refHost`; `updateContent(id, field, val)` and `sameId` already in `Content.jsx`.
**Produces:** `<ContentDrawer item pillars onUpdate onClose />` default export; `Content.jsx` state `openId` + `onOpen(id)` passed to rows (Task 4 reuses `setOpenId`).

- [ ] **Step 1: Create `src/tabs/content/ContentDrawer.jsx`**

```jsx
import { useState, useEffect, useRef } from 'react'
import { PILLAR_COLORS } from '../../constants/index.js'
import { refHref, refHost } from '../../lib/contentFields.js'

const STATUSES = ['Idea', 'Scripted', 'Filmed', 'Edited', 'Posted']
const TEXT_FIELDS = ['idea', 'notes', 'refUrl', 'twist', 'origScript', 'script']

export default function ContentDrawer({ item, pillars, onUpdate, onClose }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(TEXT_FIELDS.map(f => [f, item[f]])))
  const [showRef, setShowRef] = useState(Boolean(item.refUrl || item.twist || item.origScript))
  const draftRef = useRef(draft)
  draftRef.current = draft
  const itemRef = useRef(item)
  itemRef.current = item

  function commit(field) {
    const val = field === 'idea' ? draftRef.current.idea.trim() : draftRef.current[field]
    if (field === 'idea' && !val) {
      setDraft(d => ({ ...d, idea: itemRef.current.idea }))
      return
    }
    if (val !== itemRef.current[field]) onUpdate(itemRef.current.id, field, val)
  }

  // Closing must never drop an edit: flush every text field first.
  function close() {
    TEXT_FIELDS.forEach(commit)
    onClose()
  }
  const closeRef = useRef(close)
  closeRef.current = close

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const field = name => ({
    value: draft[name],
    onChange: e => setDraft(d => ({ ...d, [name]: e.target.value })),
    onBlur: () => commit(name),
  })

  const pillar = pillars.find(p => String(p.id) === String(item.pillarId))
  const col = pillar ? PILLAR_COLORS[pillar.colorIdx] || PILLAR_COLORS[0] : { bg: 'var(--surface2)', text: 'var(--text2)' }
  const stepIdx = STATUSES.indexOf(item.status)
  const href = refHref(draft.refUrl)

  return (
    <div className="cs-overlay" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
      <div className="cs-drawer" role="dialog" aria-label={item.idea}>
        <div className="cs-drawer-head">
          <input className="cs-drawer-title" aria-label="Reel idea" {...field('idea')} />
          <span className="cs-pill" style={{ background: col.bg, color: col.text }}>{pillar ? pillar.name : '—'}</span>
          <button className="btn-ghost" type="button" onClick={close}>Close</button>
        </div>

        <div className="cs-steps">
          {STATUSES.map((s, k) => (
            <button
              key={s}
              type="button"
              className={k < stepIdx ? 'done' : k === stepIdx ? 'cur' : ''}
              onClick={() => onUpdate(item.id, 'status', s)}
            >{s}</button>
          ))}
        </div>

        <div className="cs-two">
          <div>
            <label className="cs-label" htmlFor="cs-date">Post date</label>
            <input
              id="cs-date" className="form-input" type="date" value={item.postDate}
              onChange={e => onUpdate(item.id, 'postDate', e.target.value)}
            />
          </div>
          <div>
            <label className="cs-label" htmlFor="cs-notes">Notes</label>
            <input id="cs-notes" className="form-input" placeholder="Notes…" {...field('notes')} />
          </div>
        </div>

        {showRef ? (
          <>
            <div>
              <label className="cs-label" htmlFor="cs-ref">Reference reel</label>
              <div className="cs-refcard">
                <input id="cs-ref" className="form-input" placeholder="Paste Instagram / TikTok link" {...field('refUrl')} />
                {href && <span className="cs-refhost">{refHost(draft.refUrl)}</span>}
                {href && <a className="btn-ghost" href={href} target="_blank" rel="noopener noreferrer">Open ↗</a>}
              </div>
            </div>
            <div>
              <label className="cs-label" htmlFor="cs-twist">The twist · how mine differs</label>
              <textarea id="cs-twist" className="cs-twist" placeholder="One or two lines: what am I changing? Audience, stakes, metaphor, ending…" {...field('twist')} />
            </div>
            <div>
              <span className="cs-label">Script · before and after</span>
              <div className="cs-two">
                <div>
                  <label className="cs-label cs-label-sm" htmlFor="cs-orig">Original (their transcript)</label>
                  <textarea id="cs-orig" className="form-input cs-script cs-script-orig" placeholder="Paste what they say…" {...field('origScript')} />
                </div>
                <div>
                  <label className="cs-label cs-label-sm" htmlFor="cs-script">My draft</label>
                  <textarea id="cs-script" className="form-input cs-script" placeholder="Hook, beats, close…" {...field('script')} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <button className="cs-addref" type="button" onClick={() => setShowRef(true)}>+ Add a reference reel (unlocks original vs my draft)</button>
            <div>
              <label className="cs-label" htmlFor="cs-script">Script</label>
              <textarea id="cs-script" className="form-input cs-script" placeholder="Hook, beats, close…" {...field('script')} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `Content.jsx` — imports and state**

Add imports:
```js
import ContentDrawer from './content/ContentDrawer.jsx'
import { formatPostDate } from '../lib/contentFields.js'
```
In `Content()` add `const [openId, setOpenId] = useState(null)` and, next to the `active`/`posted` consts:
```js
  const openItem = openId === null ? null : state.content.find(c => sameId(c.id, openId))
```

- [ ] **Step 3: `Content.jsx` — row cells.** `ContentRow` gets a new prop `onOpen`. Insert two `<td>`s between the status `<td>` and the notes `<td>`:

```jsx
      <td>
        <span className={'cs-date' + (c.postDate ? '' : ' none')}>{c.postDate ? formatPostDate(c.postDate) : '—'}</span>
      </td>
      <td>
        <span className="cs-has">
          <span className={'cs-tag' + (c.refUrl ? ' on' : '')} title="Reference reel">REF</span>
          <span className={'cs-tag' + (c.script ? ' on' : '')} title="Script">SCR</span>
          <button className="btn-ghost cs-open" type="button" aria-label={`Open ${c.idea}`} onClick={() => onOpen(c.id)}>Open</button>
        </span>
      </td>
```
Pass `onOpen={setOpenId}` on **both** `<SortableContentRow>` and the posted `<ContentRow>`.

- [ ] **Step 4: `Content.jsx` — tables.** In all **three** `<colgroup>`s replace the five `<col>`s with:
```jsx
              <col style={{ width: '220px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '34px' }} />
```
`<thead>`: insert `<th>Post date</th><th>Has</th>` between `Status` and `Notes`. Add row: between the status `<td>` and notes `<td>` insert:
```jsx
              <td>
                <input className="form-input" type="date" aria-label="Post date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ fontSize: '12px', padding: '4px 8px' }} />
              </td>
              <td></td>
```

- [ ] **Step 5: `Content.jsx` — render the drawer** just before the `{/* Pillar Manager Modal */}` comment:
```jsx
      {openItem && (
        <ContentDrawer
          key={openItem.id}
          item={openItem}
          pillars={state.pillars}
          onUpdate={updateContent}
          onClose={() => setOpenId(null)}
        />
      )}
```
(Deleting the open item makes `openItem` undefined → drawer unmounts. No extra code.)

- [ ] **Step 6: CSS** — append to `src/index.css`:

```css
/* ── Content studio ─────────────────────────────────────────── */
.cs-date { font-family: "DM Mono", monospace; font-size: 12px; color: var(--text2); white-space: nowrap; }
.cs-date.none { color: var(--text3); }
.cs-has { display: flex; align-items: center; gap: 4px; }
.cs-tag { font-family: "DM Mono", monospace; font-size: 10px; padding: 1px 5px; border-radius: 4px; border: 1px solid var(--border); color: var(--border2); }
.cs-tag.on { background: var(--blue-light); color: var(--blue); border-color: transparent; }
.cs-open { font-size: 11px; padding: 2px 8px; margin-left: 4px; }
.cs-pill { padding: 3px 9px; border-radius: 100px; font-size: 12px; font-weight: 500; white-space: nowrap; }
.cs-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.3); z-index: 200; display: flex; justify-content: flex-end; }
.cs-drawer { background: var(--surface); width: min(640px, 100%); height: 100%; overflow-y: auto; border-left: 1px solid var(--border); padding: 20px; display: flex; flex-direction: column; gap: 18px; animation: fadeIn 0.18s ease; }
.cs-drawer-head { display: flex; align-items: center; gap: 10px; }
.cs-drawer-title { flex: 1; min-width: 0; border: none; outline: none; background: none; font-family: "DM Sans", sans-serif; font-size: 19px; font-weight: 600; letter-spacing: -0.3px; color: var(--text); }
.cs-drawer-title:focus { box-shadow: 0 1px 0 var(--accent); }
.cs-steps { display: flex; gap: 4px; flex-wrap: wrap; }
.cs-steps button { font-family: "DM Sans", sans-serif; font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 100px; border: 1px solid var(--border); background: var(--surface2); color: var(--text3); cursor: pointer; }
.cs-steps button.done { background: var(--accent-light); color: var(--accent); border-color: transparent; }
.cs-steps button.cur { background: var(--accent); color: #fff; border-color: transparent; }
.cs-label { display: block; font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 5px; }
.cs-label-sm { font-size: 10px; }
.cs-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.cs-refcard { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 10px; }
.cs-refcard .form-input { flex: 1 1 220px; }
.cs-refcard a { text-decoration: none; }
.cs-refhost { font-size: 12px; color: var(--text2); }
.cs-twist { width: 100%; min-height: 54px; resize: vertical; border: none; outline: none; border-radius: 6px; padding: 9px 11px; background: var(--amber-light); color: var(--text); font-family: "DM Sans", sans-serif; font-size: 13px; line-height: 1.45; }
.cs-script { min-height: 230px; resize: vertical; line-height: 1.6; padding: 10px; }
.cs-script-orig { background: var(--surface2); color: var(--text2); }
.cs-addref { width: 100%; border: 1px dashed var(--border2); border-radius: 8px; padding: 12px; background: none; cursor: pointer; font-family: "DM Sans", sans-serif; font-size: 12px; color: var(--text3); }
.cs-addref:hover { border-color: var(--accent); color: var(--accent); }
@media (max-width: 520px) { .cs-two { grid-template-columns: minmax(0, 1fr); } }
```

- [ ] **Step 7: Verify** — `npm test` PASS, `npm run build` clean.

- [ ] **Step 8: Commit** — `git add src && git commit -m "feat(content): add post date and script columns with detail drawer"`

---

### Task 4: Schedule view

**Files:**
- Create: `src/tabs/content/ContentSchedule.jsx`
- Modify: `src/tabs/Content.jsx` (toolbar toggle + conditional render)
- Modify: `src/index.css` (append after Task 3's block)

**Interfaces — Consumes:** `monthGrid`, `todayISO`, `formatPostDate`; from `Content.jsx`: `updateContent`, `setOpenId`, and the **already pillar-filtered** lists `active` and `posted`.
**Produces:** `<ContentSchedule items pillars onUpdate onOpen />` default export, where `items = [...active, ...posted]`.

- [ ] **Step 1: Create `src/tabs/content/ContentSchedule.jsx`**

```jsx
import { useState, useRef } from 'react'
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { PILLAR_COLORS } from '../../constants/index.js'
import { monthGrid, todayISO, formatPostDate } from '../../lib/contentFields.js'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TRAY = 'tray'

function chipStyle(item, pillars) {
  const p = pillars.find(x => String(x.id) === String(item.pillarId))
  const c = p ? PILLAR_COLORS[p.colorIdx] || PILLAR_COLORS[0] : { bg: 'var(--surface2)', text: 'var(--text2)' }
  return { background: c.bg, color: c.text }
}

function Chip({ item, pillars, onOpen }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: String(item.id) })
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={'cs-chip' + (item.status === 'Posted' ? ' posted' : '') + (isDragging ? ' dragging' : '')}
      style={chipStyle(item, pillars)}
      onClick={() => onOpen(item.id)}
      {...attributes}
      {...listeners}
    >
      {item.idea}
    </button>
  )
}

function Day({ iso, isToday, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: iso })
  return (
    <div ref={setNodeRef} className={'cs-day' + (isToday ? ' today' : '') + (isOver ? ' over' : '')}>
      <span className="cs-day-n">{Number(iso.slice(8))}</span>
      {children}
    </div>
  )
}

function Tray({ children }) {
  const { setNodeRef, isOver } = useDroppable({ id: TRAY })
  return <div ref={setNodeRef} className={'cs-side' + (isOver ? ' over' : '')}>{children}</div>
}

export default function ContentSchedule({ items, pillars, onUpdate, onOpen }) {
  const today = todayISO()
  const [ym, setYm] = useState({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 })
  const [activeId, setActiveId] = useState(null)
  const justDragged = useRef(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function shift(delta) {
    setYm(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  // A drag that ends over its own chip can still emit a click; don't open the drawer for it.
  function open(id) { if (!justDragged.current) onOpen(id) }

  function handleDragEnd({ active, over }) {
    setActiveId(null)
    setTimeout(() => { justDragged.current = false }, 0)
    if (!over) return
    const item = items.find(i => String(i.id) === active.id)
    const next = over.id === TRAY ? '' : over.id
    if (item && item.postDate !== next) onUpdate(item.id, 'postDate', next)
  }

  const unscheduled = items.filter(i => !i.postDate && i.status !== 'Posted')
  const upNext = items
    .filter(i => i.postDate >= today && i.status !== 'Posted')
    .sort((a, b) => a.postDate.localeCompare(b.postDate))
  const activeItem = activeId === null ? null : items.find(i => String(i.id) === activeId)

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => { justDragged.current = true; setActiveId(active.id) }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { setActiveId(null); justDragged.current = false }}
    >
      <div className="cs-sched">
        <div className="cs-cal">
          <div className="cs-cal-head">
            <b>{MONTHS[ym.month]} {ym.year}</b>
            <button className="btn-ghost" type="button" aria-label="Previous month" onClick={() => shift(-1)}>‹</button>
            <button className="btn-ghost" type="button" onClick={() => setYm({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 })}>Today</button>
            <button className="btn-ghost" type="button" aria-label="Next month" onClick={() => shift(1)}>›</button>
          </div>
          <div className="cs-dow">{DOW.map(d => <div key={d}>{d}</div>)}</div>
          <div className="cs-days">
            {monthGrid(ym.year, ym.month).map((iso, k) => iso === null
              ? <div key={'pad' + k} className="cs-day pad" />
              : (
                <Day key={iso} iso={iso} isToday={iso === today}>
                  {items.filter(i => i.postDate === iso).map(i => <Chip key={i.id} item={i} pillars={pillars} onOpen={open} />)}
                </Day>
              ))}
          </div>
        </div>

        <div className="cs-side-col">
          <Tray>
            <h4>Unscheduled · {unscheduled.length}</h4>
            {unscheduled.map(i => <Chip key={i.id} item={i} pillars={pillars} onOpen={open} />)}
            <p>{unscheduled.length ? 'Drag an idea onto a day. Drag it back here to unschedule.' : 'Everything has a post date. Drag a chip here to unschedule it.'}</p>
          </Tray>
          <div className="cs-side">
            <h4>Up next</h4>
            {upNext.length === 0 && <p>Nothing scheduled.</p>}
            {upNext.map(i => (
              <button key={i.id} type="button" className="cs-up" onClick={() => onOpen(i.id)}>
                <span>{i.idea}</span><span className="cs-date">{formatPostDate(i.postDate)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeItem && <span className="cs-chip cs-chip-overlay" style={chipStyle(activeItem, pillars)}>{activeItem.idea}</span>}
      </DragOverlay>
    </DndContext>
  )
}
```

- [ ] **Step 2: `Content.jsx` — toggle.** Add `import ContentSchedule from './content/ContentSchedule.jsx'` and state `const [view, setView] = useState('list')`. In the toolbar, replace the lone `Manage Pillars` button with:
```jsx
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="cs-seg" role="group" aria-label="View">
            <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>List</button>
            <button type="button" className={view === 'schedule' ? 'on' : ''} onClick={() => setView('schedule')}>Schedule</button>
          </div>
          <button className="btn-ghost" onClick={() => setModalOpen(true)} style={{ fontSize: '12px' }}>Manage Pillars</button>
        </div>
```

- [ ] **Step 3: `Content.jsx` — conditional render.** Wrap the existing `<div className="content-table-wrap"> … </div>` block (whole thing, unchanged inside) as:
```jsx
      {view === 'schedule' ? (
        <ContentSchedule items={[...active, ...posted]} pillars={state.pillars} onUpdate={updateContent} onOpen={setOpenId} />
      ) : (
        <div className="content-table-wrap"> …existing… </div>
      )}
```

- [ ] **Step 4: CSS** — append:

```css
.cs-seg { display: flex; border: 1px solid var(--border2); border-radius: 6px; overflow: hidden; }
.cs-seg button { border: none; background: none; cursor: pointer; font-family: "DM Sans", sans-serif; font-size: 12px; padding: 5px 12px; color: var(--text2); }
.cs-seg button.on { background: var(--accent-light); color: var(--accent); font-weight: 500; }
.cs-sched { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 16px; align-items: start; }
.cs-cal { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; min-width: 0; }
.cs-cal-head { display: flex; align-items: center; gap: 8px; padding: 12px 16px; }
.cs-cal-head b { font-weight: 600; font-size: 15px; margin-right: auto; }
.cs-dow, .cs-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.cs-dow div { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.4px; padding: 6px 8px; background: var(--surface2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.cs-day { min-height: 92px; min-width: 0; border-bottom: 1px solid var(--border); border-left: 1px solid var(--border); padding: 5px; display: flex; flex-direction: column; align-items: stretch; gap: 3px; font-size: 11px; color: var(--text2); }
.cs-day:nth-child(7n + 1) { border-left: none; }
.cs-day.pad { background: var(--surface2); }
.cs-day.over { background: var(--accent-light); }
.cs-day-n { width: 20px; height: 20px; display: grid; place-items: center; border-radius: 50%; }
.cs-day.today .cs-day-n { background: var(--accent); color: #fff; }
.cs-chip { display: block; width: 100%; text-align: left; border: none; border-radius: 4px; padding: 2px 6px; cursor: grab; touch-action: none; font-family: "DM Sans", sans-serif; font-size: 11px; font-weight: 500; line-height: 1.3; overflow-wrap: anywhere; }
.cs-chip.posted { opacity: 0.55; text-decoration: line-through; }
.cs-chip.dragging { opacity: 0.35; }
.cs-chip-overlay { width: auto; max-width: 200px; cursor: grabbing; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
.cs-side-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.cs-side { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.cs-side.over { border-color: var(--accent); background: var(--accent-light); }
.cs-side h4 { font-size: 11px; font-weight: 500; color: var(--text3); text-transform: uppercase; letter-spacing: 0.4px; }
.cs-side p { font-size: 12px; color: var(--text3); line-height: 1.4; }
.cs-side .cs-chip { font-size: 12px; padding: 5px 8px; }
.cs-up { display: flex; justify-content: space-between; gap: 8px; width: 100%; text-align: left; background: none; border: none; border-top: 1px solid var(--border); padding: 6px 0 2px; cursor: pointer; font-family: "DM Sans", sans-serif; font-size: 12px; color: var(--text); }
@media (max-width: 860px) { .cs-sched { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 600px) { .cs-day { min-height: 64px; padding: 3px; } .cs-chip { font-size: 9.5px; padding: 1px 3px; } }
```

- [ ] **Step 5: Verify** — `npm test` PASS, `npm run build` clean.

- [ ] **Step 6: Commit** — `git add src && git commit -m "feat(content): add schedule view with drag-to-date"`

---

### Task 5: End-to-end verification (controller, not a subagent)

Browser pass in **demo mode** (signed out — in-memory, touches no real data), per spec §Testing item 3:

- [ ] add item with a date → chip on that day in Schedule
- [ ] open drawer, type script, press Escape → SCR lit; reopen → text still there
- [ ] Add a reference → twist + before/after appear; `javascript:` URL shows no Open link
- [ ] drag chip to another day → List date updates; drag to tray → unscheduled
- [ ] pillar filter applies in both views; month nav + Today work
- [ ] regressions: inline idea edit, pillar popover, status select, notes, drag-reorder, delete, posted collapse, Manage Pillars
- [ ] 400px width: no horizontal page scroll, drawer usable
- [ ] console has no errors

### Task 6: Migration (handoff — needs Supabase auth)

Apply the SQL in spec §Data via Supabase MCP once authenticated, or paste into the SQL editor. **Before deploying/merging to `main`** (Vercel auto-deploys). Then confirm the five columns exist.
