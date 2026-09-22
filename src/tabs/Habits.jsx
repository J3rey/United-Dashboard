import { useState } from 'react'
import * as db from '../services/db.js'

let _nextId = 400
const uid = () => _nextId++

function toDs(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDates(offset) {
  const now = new Date(), day = now.getDay(), mon = new Date(now)
  mon.setDate(now.getDate() - ((day + 6) % 7) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return toDs(d)
  })
}

const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const CheckIcon = () => (
  <svg className="checkmark" viewBox="0 0 12 12">
    <polyline points="2,6 5,9 10,3" />
  </svg>
)

export default function Habits({ state, setState, user, isDemo }) {
  const [habitType, setHabitType] = useState('weekly')
  const [nameInput, setNameInput] = useState('')
  const [goalInput, setGoalInput] = useState(3)
  const [archivedOpen, setArchivedOpen] = useState(false)
  // Mobile: which weekday (0 = Mon) is shown; persists across week navigation
  const [selIdx, setSelIdx] = useState(() => (new Date().getDay() + 6) % 7)

  const dates = getWeekDates(state.habitWeekOffset)
  const todayDs = toDs(new Date())

  // Ticking Gym auto-ticks Physical exercise (faint, not manually toggleable)
  const gymHabit = state.habits.find(h => /^gym\b/i.test(h.name))
  const peHabit  = state.habits.find(h => /physical exercise/i.test(h.name))
  const isAuto = (habitId, date) =>
    !!(peHabit && gymHabit && habitId === peHabit.id && state.habitChecks[`${gymHabit.id}_${date}`])
  const isChecked = (habitId, date) => !!state.habitChecks[`${habitId}_${date}`] || isAuto(habitId, date)

  const startLabel = new Date(dates[0] + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  const endLabel   = new Date(dates[6] + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })

  function habitNav(dir) {
    setState(prev => ({ ...prev, habitWeekOffset: prev.habitWeekOffset + dir }))
  }

  function toggleHabit(habitId, date) {
    if (isAuto(habitId, date)) return
    const key = `${habitId}_${date}`
    const newChecked = !state.habitChecks[key]
    setState(prev => ({
      ...prev,
      habitChecks: { ...prev.habitChecks, [key]: newChecked },
    }))
    if (!isDemo) db.toggleHabitLog(user.id, habitId, date, newChecked).catch(console.error)
  }

  function setArchived(id, archived) {
    setState(prev => ({
      ...prev,
      habits: prev.habits.map(h => (h.id === id ? { ...h, archived } : h)),
    }))
    if (!isDemo) db.updateHabit(id, { archived }).catch(console.error)
  }

  function commitName(h, el) {
    const v = el.textContent.trim()
    if (!v || v === h.name) { el.textContent = h.name; return }
    setState(prev => ({
      ...prev,
      habits: prev.habits.map(x => (x.id === h.id ? { ...x, name: v } : x)),
    }))
    if (!isDemo) db.updateHabit(h.id, { name: v }).catch(console.error)
  }

  function commitGoal(h, el) {
    const goal = Math.min(7, Math.max(1, parseInt(el.textContent, 10) || h.goal))
    el.textContent = goal
    if (goal === h.goal) return
    setState(prev => ({
      ...prev,
      habits: prev.habits.map(x => (x.id === h.id ? { ...x, goal } : x)),
    }))
    if (!isDemo) db.updateHabit(h.id, { goal }).catch(console.error)
  }

  async function addHabit() {
    if (!nameInput.trim()) return
    const isDai = habitType === 'daily'
    const habit = { name: nameInput.trim(), type: habitType, goal: isDai ? 7 : goalInput, daily: isDai }
    if (isDemo) {
      setState(prev => ({ ...prev, habits: [...prev.habits, { id: uid(), ...habit }] }))
    } else {
      const id = await db.insertHabit(user.id, habit, state.habits.length).catch(console.error)
      if (id) setState(prev => ({ ...prev, habits: [...prev.habits, { id, ...habit }] }))
    }
    setNameInput('')
  }

  function renderHabitRow(h) {
    const count = dates.filter(d => isChecked(h.id, d)).length

    let completion
    if (!h.daily) {
      const cls = count >= h.goal ? 'completion-done' : count > 0 ? 'completion-partial' : 'completion-empty'
      completion = (
        <span className={'completion-badge ' + cls}>
          <span style={{ pointerEvents: 'none', userSelect: 'none' }}>{count}/</span>
          <span
            suppressContentEditableWarning contentEditable
            style={{ cursor: 'text', outline: 'none' }}
            title="Weekly target"
            onKeyDown={ev => {
              if (ev.key === 'Enter')  { ev.preventDefault(); ev.currentTarget.blur(); return }
              if (ev.key === 'Escape') { ev.currentTarget.textContent = h.goal; ev.currentTarget.blur(); return }
              if (ev.ctrlKey || ev.metaKey) return
              if (/^(Arrow|Backspace|Delete|Tab|Home|End)/.test(ev.key)) return
              if (!/^[1-7]$/.test(ev.key)) { ev.preventDefault(); return }
              const selLen = window.getSelection()?.toString().length || 0
              if (ev.currentTarget.textContent.length - selLen >= 1) ev.preventDefault()
            }}
            onBlur={ev => commitGoal(h, ev.currentTarget)}
          >{h.goal}</span>
        </span>
      )
    } else {
      completion = <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{count}/7</span>
    }

    return (
      <div key={h.id} className="habit-row">
        <div className="habit-name">
          <span
            className="habit-name-text"
            suppressContentEditableWarning contentEditable
            style={{ cursor: 'text', outline: 'none' }}
            onKeyDown={ev => {
              if (ev.key === 'Enter')  { ev.preventDefault(); ev.currentTarget.blur() }
              if (ev.key === 'Escape') { ev.currentTarget.textContent = h.name; ev.currentTarget.blur() }
            }}
            onBlur={ev => commitName(h, ev.currentTarget)}
          >{h.name}</span>
          <button
            className="del-btn"
            onClick={() => setArchived(h.id, true)}
            title="Archive"
            style={{ marginLeft: '6px', fontSize: '11px' }}
          >×</button>
        </div>
        {dates.map((d, i) => {
          const auto = isAuto(h.id, d)
          const checked = isChecked(h.id, d)
          const cls = (checked ? (h.daily ? 'cb daily-checked' : 'cb checked') : 'cb') + (auto ? ' auto-checked' : '')
          return (
            <div key={d} className={'habit-check' + (i === selIdx ? ' sel' : '')}>
              <div className={cls} onClick={() => toggleHabit(h.id, d)}>
                {checked && <CheckIcon />}
              </div>
            </div>
          )
        })}
        <div className="habit-completion">{completion}</div>
      </div>
    )
  }

  const live     = state.habits.filter(h => !h.archived)
  const archived = state.habits.filter(h => h.archived)
  const weekly = live.filter(h => !h.daily)
  const daily  = live.filter(h => h.daily)
  const habitsInDisplayOrder = [...weekly, ...daily]

  return (
    <div className="panel">
      <div className="habit-layout">
        <div>
          <div className="habit-table-wrap">
            <div className="habit-hdr-row">
              <h2>Habit Tracker</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text2)' }}>
                <button
                  className="btn-ghost"
                  onClick={() => setState(prev => ({ ...prev, habitWeekOffset: 0 }))}
                  disabled={state.habitWeekOffset === 0}
                  aria-label="Jump to the current week"
                >Today</button>
                <button className="btn-ghost" onClick={() => habitNav(-1)} aria-label="Previous week">←</button>
                <span aria-live="polite" className="habit-week-range">{startLabel} — {endLabel}</span>
                <button className="btn-ghost" onClick={() => habitNav(1)} aria-label="Next week">→</button>
              </div>
            </div>

            {/* Mobile day strip: free-scrolling, tap a day to show its column */}
            <div className="habit-day-strip">
              {dates.map((d, i) => (
                <button
                  key={d}
                  className={'habit-day-chip' + (i === selIdx ? ' sel' : '') + (d === todayDs ? ' today' : '')}
                  onClick={() => setSelIdx(i)}
                >
                  <span>{DAY_NAMES[i]}</span>
                  <b>{parseInt(d.slice(8), 10)}</b>
                </button>
              ))}
            </div>

            {/* Header row */}
            <div className="habit-row" style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
              <div className="habit-name" style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', padding: '8px 16px' }}>Habit</div>
              {DAY_NAMES.map((d, i) => (
                <div key={d} className={'habit-day-hdr' + (i === selIdx ? ' sel' : '')}>{d}</div>
              ))}
              <div className="habit-day-hdr">Progress</div>
            </div>

            {/* Weekly goals section */}
            {weekly.length > 0 && (
              <>
                <div className="habit-row" style={{ background: 'var(--surface2)' }}>
                  <div className="habit-section-label">Weekly Goals</div>
                </div>
                {weekly.map(h => renderHabitRow(h))}
              </>
            )}

            {/* Daily tracking section */}
            {daily.length > 0 && (
              <>
                <div className="habit-row" style={{ background: 'var(--surface2)' }}>
                  <div className="habit-section-label">Daily Tracking</div>
                </div>
                {daily.map(h => renderHabitRow(h))}
              </>
            )}

            {/* Archived section */}
            {archived.length > 0 && (
              <>
                <div className="habit-row" style={{ background: 'var(--surface2)' }}>
                  <div
                    className="habit-section-label habit-section-toggle"
                    onClick={() => setArchivedOpen(v => !v)}
                  >
                    <span>Archived ({archived.length})</span>
                    <span className={'collapse-icon' + (archivedOpen ? ' open' : '')}>&#9650;</span>
                  </div>
                </div>
                {archivedOpen && archived.map(h => (
                  <div key={h.id} className="habit-row">
                    <div className="habit-name" style={{ color: 'var(--text3)' }}>{h.name}</div>
                    <div className="habit-archived-actions">
                      <button className="btn-ghost" onClick={() => setArchived(h.id, false)}>Restore</button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div>
          {/* Weekly Overview */}
          <div className="side-card">
            <h3>Weekly Overview</h3>
            {habitsInDisplayOrder.map(h => {
              const count = dates.filter(d => isChecked(h.id, d)).length
              const pct = Math.round((count / h.goal) * 100)
              const color = h.daily ? 'var(--blue)' : count >= h.goal ? 'var(--green)' : 'var(--accent)'
              return (
                <div key={h.id} className="progress-item">
                  <div className="progress-label">
                    <span style={{ fontSize: '12px' }}>{h.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{count}/{h.goal}</span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add Habit */}
          <div className="side-card">
            <h3>Add Habit</h3>
            <div className="form-row" style={{ marginBottom: '8px' }}>
              <label>Name</label>
              <input
                className="form-input"
                placeholder="e.g. Read 30 min"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addHabit()}
                style={{ fontSize: '12px', padding: '5px 8px' }}
              />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Type</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className={'goal-type-btn' + (habitType === 'weekly' ? ' active' : '')} onClick={() => setHabitType('weekly')}>Weekly goal</button>
                <button className={'goal-type-btn' + (habitType === 'daily'  ? ' active' : '')} onClick={() => setHabitType('daily')}>Daily track</button>
              </div>
            </div>
            {habitType === 'weekly' && (
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Times per week</label>
                <input
                  className="form-input"
                  type="number"
                  value={goalInput}
                  min={1} max={7}
                  onChange={e => setGoalInput(parseInt(e.target.value) || 1)}
                  style={{ fontSize: '12px', padding: '5px 8px', width: '60px' }}
                />
              </div>
            )}
            <button className="btn-primary" onClick={addHabit} style={{ fontSize: '12px', padding: '6px 16px', width: 'auto' }}>Add Habit</button>
          </div>
        </div>
      </div>
    </div>
  )
}
