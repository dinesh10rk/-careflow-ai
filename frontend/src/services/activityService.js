import { isMock } from '../config'
import { request } from './api'
import * as mock from './mockApi'

export const activityService = {
  list: (params = {}) => (isMock() ? mock.listActivity(params) : request('/api/activity', { params })),
}

export const statsService = {
  get: () => (isMock() ? mock.getStats() : request('/api/stats')),
}

// Always talks to the real backend, even in demo-data mode, so Settings can show the truth.
export const healthService = {
  get: () => request('/health', { timeout: 15000 }),
}
