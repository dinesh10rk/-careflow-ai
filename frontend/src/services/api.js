import { API_BASE_URL } from '../config'

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'error', details } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// --- "Waking the server" support: free hosts sleep when idle, so the first call can be slow.
const SLOW_AFTER_MS = 4000
const TIMEOUT_MS = 60000
let slowCount = 0
const slowListeners = new Set()

export function subscribeSlowRequests(listener) {
  slowListeners.add(listener)
  listener(slowCount > 0)
  return () => slowListeners.delete(listener)
}
function bumpSlow(delta) {
  slowCount = Math.max(0, slowCount + delta)
  slowListeners.forEach((l) => l(slowCount > 0))
}

export async function request(path, { method = 'GET', body, params, timeout = TIMEOUT_MS } = {}) {
  const url = new URL(API_BASE_URL + path)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }

  const controller = new AbortController()
  const abortTimer = setTimeout(() => controller.abort(), timeout)
  let slowFired = false
  const slowTimer = setTimeout(() => {
    slowFired = true
    bumpSlow(1)
  }, SLOW_AFTER_MS)

  try {
    let res
    try {
      res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
    } catch (err) {
      const timedOut = err.name === 'AbortError'
      throw new ApiError(
        timedOut
          ? 'The server took too long to respond. Try again in a moment.'
          : `Cannot reach the CareFlow API at ${API_BASE_URL}. Check that the backend is running.`,
        { status: 0, code: timedOut ? 'timeout' : 'network_error' },
      )
    }

    let data = null
    try {
      data = await res.json()
    } catch {
      /* empty or non-JSON body */
    }

    if (!res.ok) {
      throw new ApiError(data?.error?.message || `Request failed (${res.status}).`, {
        status: res.status,
        code: data?.error?.code || 'http_error',
        details: data?.error?.details,
      })
    }
    return data
  } finally {
    clearTimeout(abortTimer)
    clearTimeout(slowTimer)
    if (slowFired) bumpSlow(-1)
  }
}
