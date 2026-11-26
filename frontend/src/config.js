// Public, build-time configuration. Never put secrets here.
const env = import.meta.env

export const API_BASE_URL = (env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

const DEFAULT_SOURCE = env.VITE_DATA_SOURCE === 'api' ? 'api' : 'mock'
const SOURCE_KEY = 'careflow.dataSource'
const SETTINGS_KEY = 'careflow.settings'

function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable: ignore */
  }
}

/** 'mock' (fictional data in this browser) or 'api' (FastAPI backend). */
export function getDataSource() {
  const stored = read(SOURCE_KEY)
  return stored === 'api' || stored === 'mock' ? stored : DEFAULT_SOURCE
}

export function setDataSource(value) {
  write(SOURCE_KEY, value === 'api' ? 'api' : 'mock')
}

export function isMock() {
  return getDataSource() === 'mock'
}

const DEFAULT_SETTINGS = { clinicName: 'Harbour Street Medical Centre', senderName: '' }

export function getClinicSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(read(SETTINGS_KEY)) || {}) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveClinicSettings(settings) {
  write(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }))
}
