import { useState, useEffect } from 'react'
import { defaultState } from '../state/defaultState.js'
import * as db from '../services/db.js'

const emptyUserState = {
  ...defaultState,
  events: [],
  expenses: [],
  income: [],
  debts: [],
  habits: [],
  habitChecks: {},
  pillars: [],
  content: [],
}

export function useAppData(user) {
  const [state, setStateRaw] = useState(defaultState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setStateRaw(defaultState)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const load = async () => {
      try {
        return await db.fetchAll(user.id)
      } catch (err) {
        if (!err.message?.includes('JWT issued at future')) throw err
        await new Promise(resolve => setTimeout(resolve, 2000))
        return db.fetchAll(user.id)
      }
    }
    load()
      .then(data => { setStateRaw(data); setLoading(false) })
      .catch(err => {
        console.error('fetchAll failed', err)
        setStateRaw(emptyUserState)
        setError(err.message || 'Failed to load dashboard data')
        setLoading(false)
      })
  }, [user?.id])

  function setState(updater) {
    setStateRaw(prev => typeof updater === 'function' ? updater(prev) : updater)
  }

  return { state, setState, loading, error, isDemo: !user }
}
