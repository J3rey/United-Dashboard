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
  // Pads the grid with the neighbouring months' days so there are no blank cells.
  const lead = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const total = Math.ceil((lead + days) / 7) * 7
  const cells = []
  for (let i = 0; i < total; i++) {
    const d = new Date(year, month, 1 - lead + i)
    cells.push(toISODate(d.getFullYear(), d.getMonth(), d.getDate()))
  }
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
