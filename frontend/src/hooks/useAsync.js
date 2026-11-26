import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs an async function and tracks loading / error / data.
 * Stale responses are ignored, so quick filter changes cannot show old results.
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const run = useRef(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  const execute = useCallback(async ({ silent = false } = {}) => {
    const id = ++run.current
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fnRef.current()
      if (id === run.current) setState({ data, error: null, loading: false })
    } catch (error) {
      if (id === run.current) setState((s) => ({ data: silent ? s.data : null, error, loading: false }))
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { execute() }, deps)

  return { ...state, reload: execute }
}

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
