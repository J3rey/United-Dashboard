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
