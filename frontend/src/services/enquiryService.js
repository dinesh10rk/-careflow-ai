import { isMock } from '../config'
import { request } from './api'
import * as mock from './mockApi'

const enc = encodeURIComponent

export const enquiryService = {
  list: (params = {}) => (isMock() ? mock.listEnquiries(params) : request('/api/enquiries', { params })),
  get: (id) => (isMock() ? mock.getEnquiry(id) : request(`/api/enquiries/${enc(id)}`)),
  create: (payload) => (isMock() ? mock.createEnquiry(payload) : request('/api/enquiries', { method: 'POST', body: payload })),
  update: (id, patch) => (isMock() ? mock.updateEnquiry(id, patch) : request(`/api/enquiries/${enc(id)}`, { method: 'PATCH', body: patch })),
  remove: (id) => (isMock() ? mock.deleteEnquiry(id) : request(`/api/enquiries/${enc(id)}`, { method: 'DELETE' })),
}
