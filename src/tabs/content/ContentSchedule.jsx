import { useState, useRef } from 'react'
import { DndContext, DragOverlay, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
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

function Day({ iso, isToday, outside, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: iso })
  return (
    <div ref={setNodeRef} className={'cs-day' + (outside ? ' outside' : '') + (isToday ? ' today' : '') + (isOver ? ' over' : '')}>
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
      collisionDetection={pointerWithin}
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
            {monthGrid(ym.year, ym.month).map(iso => (
              <Day key={iso} iso={iso} isToday={iso === today} outside={Number(iso.slice(5, 7)) - 1 !== ym.month}>
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
      <DragOverlay dropAnimation={null}>
        {activeItem && <span className="cs-chip cs-chip-overlay" style={chipStyle(activeItem, pillars)}>{activeItem.idea}</span>}
      </DragOverlay>
    </DndContext>
  )
}
