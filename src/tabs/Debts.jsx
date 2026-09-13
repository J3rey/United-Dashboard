import { useState } from 'react'
import * as db from '../services/db.js'

let _nextId = 400
const uid = () => _nextId++

const today = () => new Date().toISOString().split('T')[0]

export default function Debts({ state, setState, user, isDemo }) {
  const [who, setWho] = useState('')
  const [what, setWhat] = useState('')
  const [amt, setAmt] = useState('')
  const [archOpen, setArchOpen] = useState(false)

  const debts = state.debts ?? []
  const open = debts.filter(d => !d.resolved)
  const resolved = debts.filter(d => d.resolved)
  const owed = open.reduce((s, d) => s + d.amount, 0)

  async function addDebt() {
    const amount = parseFloat(amt)
    if (!who.trim() || Number.isNaN(amount) || amount <= 0) return
    const debtData = {
      date: today(), person: who.trim(), detail: what.trim(),
      amount: Math.round(amount * 100) / 100, resolved: false, resolvedAt: null,
    }
    let id
    if (isDemo) {
      id = uid()
    } else {
      id = await db.insertDebt(user.id, debtData).catch(console.error)
      if (!id) return
    }
    const entry = { id, ...debtData }
    setState(prev => ({ ...prev, debts: [entry, ...(prev.debts ?? [])] }))
    setWho(''); setWhat(''); setAmt('')
  }

  function handleKeyDown(ev) {
    if (ev.key === 'Enter') addDebt()
  }

  async function toggleResolved(d) {
    const changes = d.resolved
      ? { resolved: false, resolvedAt: null }
      : { resolved: true, resolvedAt: today() }
    if (!isDemo) db.updateDebt(d.id, changes).catch(console.error)
    setState(prev => ({
      ...prev,
      debts: (prev.debts ?? []).map(x => x.id === d.id ? { ...x, ...changes } : x),
    }))
  }

  async function deleteDebt(id) {
    if (!isDemo) {
      try {
        await db.deleteDebt(id)
      } catch (err) {
        console.error(err)
        return
      }
    }
    setState(prev => ({ ...prev, debts: (prev.debts ?? []).filter(d => d.id !== id) }))
  }

  const cols = <colgroup><col className="debt-col-who" /><col /><col className="debt-col-amt" /><col className="debt-col-act" /></colgroup>

  function row(d) {
    return (
      <tr key={d.id} className={d.resolved ? 'done' : ''}>
        <td className="who">{d.person}</td>
        <td>{d.detail}</td>
        <td className="r">${d.amount.toFixed(2)}</td>
        <td className="act">
          <button className="btn-ghost sm" onClick={() => toggleResolved(d)}>{d.resolved ? 'Reopen' : 'Resolve'}</button>{' '}
          <button className="btn-ghost sm" style={{ color: 'var(--text3)' }} onClick={() => deleteDebt(d.id)}>×</button>
        </td>
      </tr>
    )
  }

  return (
    <div className="finance-table-wrap">
      <div className="finance-toolbar">
        <span className="muted">{open.length} open</span>
        <span className="tot">Still owed <b>${owed.toFixed(2)}</b></span>
      </div>
      <table className="debt-table">
        {cols}
        <thead><tr><th>From</th><th>What</th><th className="r">Amount</th><th></th></tr></thead>
        <tbody>
          {open.length
            ? open.map(d => row(d))
            : <tr><td colSpan={4} className="empty">Nobody owes you anything</td></tr>}
        </tbody>
      </table>
      <div className="debt-add-row">
        <input className="form-input" placeholder="From" value={who} onChange={ev => setWho(ev.target.value)} onKeyDown={handleKeyDown} />
        <input className="form-input" placeholder="What for" value={what} onChange={ev => setWhat(ev.target.value)} onKeyDown={handleKeyDown} />
        <input className="form-input" placeholder="0.00" inputMode="decimal" style={{ textAlign: 'right' }} value={amt} onChange={ev => setAmt(ev.target.value)} onKeyDown={handleKeyDown} />
        <button className="btn-primary" onClick={addDebt}>Add</button>
      </div>
      <div className="posted-section-label" onClick={() => setArchOpen(o => !o)}>
        <span>Archived ({resolved.length})</span>
        <span className={'collapse-icon' + (archOpen ? ' open' : '')}>▲</span>
      </div>
      {archOpen && (
        <table className="debt-table">
          {cols}
          <thead><tr><th>From</th><th>What</th><th className="r">Amount</th><th></th></tr></thead>
          <tbody>
            {resolved.map(row)}
          </tbody>
        </table>
      )}
    </div>
  )
}
