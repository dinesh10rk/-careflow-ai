import { isMock } from '../config'
import { request } from './api'
import * as mock from './mockApi'

// Each call returns the updated enquiry, so the UI always renders what the server confirmed.
export const aiService = {
  processEnquiry: (enquiryId) =>
    isMock() ? mock.processEnquiry(enquiryId) : request('/api/ai/process-enquiry', { method: 'POST', body: { enquiry_id: enquiryId } }),
  generateResponse: (enquiryId) =>
    isMock() ? mock.generateResponse(enquiryId) : request('/api/ai/generate-response', { method: 'POST', body: { enquiry_id: enquiryId } }),
  generateReminder: (payload) =>
    isMock() ? mock.generateReminder(payload) : request('/api/ai/generate-reminder', { method: 'POST', body: payload }),
}
