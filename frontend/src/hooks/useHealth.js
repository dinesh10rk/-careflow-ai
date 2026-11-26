import { useCallback, useEffect, useState } from 'react'
import { isMock } from '../config'
import { healthService } from '../services/activityService'

/**
 * Reports what is actually connected.
 * In demo-data mode nothing is connected, and we say so without pretending.
 */
export function useHealth() {
  const [health, setHealth] = useState(() => (isMock() ? { state: 'demo' } : { state: 'checking' }))

  const check = useCallback(async () => {
    if (isMock()) {
      setHealth({ state: 'demo' })
      return
    }
    setHealth({ state: 'checking' })
    try {
      const data = await healthService.get()
      setHealth({
        state: data.status === 'ok' ? 'connected' : 'degraded',
        aiMode: data.ai?.mode,
        aiNote: data.ai?.note,
        database: data.database,
      })
    } catch (error) {
      setHealth({ state: 'down', error })
    }
  }, [])

  useEffect(() => {
    check()
  }, [check])

  return { health, recheck: check }
}
