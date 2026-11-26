/**
 * Demo-data adapter.
 *
 * Mirrors the REST contract of the FastAPI backend so the UI code is identical in both modes.
 * Data is FICTIONAL and lives only in this browser's localStorage.
 * AI results come from services/demoAi.js (rule-based, labelled "demo"; not a language model).
 */
import { ApiError } from './api'
import { classify, summarise, draftResponse, draftReminder, safetyCheck } from './demoAi'
import { getClinicSettings } from '../config'
import {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  UNCLASSIFIED,
  LIMITS,
  FICTIONAL_EMAIL_RE,
} from '../utils/constants'
import { findPlaceholders, hasDemoMarker } from '../utils/format'

const STORAGE_KEY = 'careflow.demo.v1'
const DAY = 86400000
const HOUR = 3600000

// ---------------------------------------------------------------------------------------------
// Seed data (fictional)
// ---------------------------------------------------------------------------------------------
const SEED = [
  { n: 'Mia Thompson', s: 'Routine check-up booking', m: "Hi, I'd like to book a routine check-up with Dr Patel sometime next week. Mornings suit me best. Please let me know what is available.", d: 0, h: 2, st: 'New', ai: false },
  { n: 'Oliver Brown', s: 'Chest pain this morning', m: 'I have had chest pain and shortness of breath since this morning. Should I wait for my appointment next week or come in sooner?', d: 0, h: 5, st: 'In Review', ai: true },
  { n: "Liam O'Connor", s: 'Repeat prescription request', m: 'Hello, could you please arrange a repeat script for my regular medication? I am running out at the end of this week. I normally collect from the pharmacy near the station.', d: 1, h: 1, st: 'In Review', ai: true, resp: 'draft' },
  { n: 'Chloe Nguyen', s: 'Question about an invoice', m: 'I received an invoice for my visit on 3 November but I thought that consultation was bulk billed. Could someone check my account and let me know?', d: 1, h: 6, st: 'New', ai: false },
  { n: 'Ethan Harris', s: 'Baby unwell overnight', m: 'My baby has had a high fever and a rash since last night. I was not sure whether to ring the clinic or somewhere else.', d: 2, h: 3, st: 'In Review', ai: true },
  { n: 'Isla Davies', s: 'Need to reschedule Thursday visit', m: 'Hi, I need to reschedule my appointment on Thursday with Dr Nguyen. Would the following week be possible? Afternoons are best for me.', d: 3, h: 4, st: 'Awaiting Staff', ai: true, resp: 'approved' },
  { n: 'Jack Wilson', s: 'Receipt for tax purposes', m: 'Could you please send me a receipt for my consultation on 12 October? I need it for my tax records.', d: 4, h: 2, st: 'Resolved', ai: true, resp: 'approved' },
  { n: 'Noah Williams', s: 'Transfer of records to new GP', m: 'I am moving interstate and would like my medical records transferred to my new practice. Please tell me what you need from me.', d: 5, h: 5, st: 'Awaiting Staff', ai: true, resp: 'draft' },
  { n: 'Ava Martin', s: 'Opening hours over the holidays', m: 'Are you open between Christmas and New Year? No rush, I just want to plan ahead.', d: 6, h: 1, st: 'Resolved', ai: true, resp: 'approved' },
  { n: 'Zoe Anderson', s: 'Copy of immunisation record', m: 'Could I please get a copy of my immunisation record? My workplace has asked for it.', d: 9, h: 3, st: 'Resolved', ai: true, resp: 'approved' },
  { n: 'Lucas White', s: 'Telehealth link not working', m: 'The link for my telehealth appointment tomorrow does not seem to open. Can someone resend it?', d: 11, h: 2, st: 'Resolved', ai: true, resp: 'approved' },
  { n: 'Ruby Clark', s: 'New patient registration', m: 'We have just moved to the area. How do I register as a new patient and what do I need to bring?', d: 13, h: 4, st: 'Resolved', ai: true, resp: 'approved' },
  { n: 'Henry Lewis', s: 'Payment plan question', m: 'I have an outstanding account from last month and would like to ask about paying it in two instalments.', d: 17, h: 5, st: 'In Review', ai: true, resp: 'draft' },
  { n: 'Sophie Walker', s: 'Follow-up booking after referral', m: 'My specialist has asked me to see Dr Patel for a follow-up in a few weeks. How do I book that?', d: 20, h: 1, st: 'Resolved', ai: true, resp: 'approved' },
  { n: 'Mason Hall', s: 'Are you taking new patients?', m: 'Hi, are you currently accepting new patients? I live nearby and would like to switch practices.', d: 26, h: 6, st: 'Resolved', ai: true, resp: 'approved' },
  { n: 'Grace Taylor', s: 'Reception role enquiry', m: 'I saw the clinic is growing. Is there a way to send through my resume for future reception roles?', d: 33, h: 2, st: 'Resolved', ai: true, resp: 'approved' },
  { n: 'Harper Evans', s: 'Telehealth booking', m: 'Can I book a telehealth consult for next Monday? I am working from home that day.', d: 41, h: 3, st: 'Resolved', ai: true, resp: 'approved' },
  { n: 'Archie Moore', s: 'Script before overseas travel', m: 'I am travelling overseas next month and would like to organise my repeat prescription before I go.', d: 49, h: 4, st: 'Resolved', ai: true, resp: 'approved' },
]

function makeId() {
  return globalThis.crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function emailFor(name) {
  return `${name.toLowerCase().replace(/[^a-z\s]/g, '').trim().replace(/\s+/g, '.')}@example.com`
}

function buildSeed() {
  const settings = getClinicSettings()
  const now = Date.now()
  const enquiries = []
  const activity = []
  const log = (ts, action_type, enq, description, ai_mode = 'none') =>
    activity.push({ id: makeId(), timestamp: new Date(ts).toISOString(), action_type, enquiry_id: enq.id, enquiry_reference: enq.reference, description, ai_mode })

  // Oldest first so reference numbers ascend with time.
  const ordered = [...SEED].sort((a, b) => b.d - a.d || b.h - a.h)
  ordered.forEach((row, i) => {
    const created = now - row.d * DAY - row.h * HOUR
    const base = { patient_name: row.n, contact_email: emailFor(row.n), subject: row.s, message: row.m }
    const safety = safetyCheck(`${row.s} ${row.m}`)
    const enq = {
      id: makeId(),
      reference: `ENQ-${String(i + 1).padStart(4, '0')}`,
      ...base,
      category: null,
      priority: safety.flagged ? 'Urgent' : 'Normal',
      status: row.st,
      requires_human_review: safety.flagged,
      safety_flags: safety.matches,
      ai_classification: null,
      ai_summary: null,
      ai_response: null,
      ai_reminder: null,
      created_at: new Date(created).toISOString(),
      updated_at: new Date(created).toISOString(),
    }
    log(created, 'enquiry_created', enq, `Enquiry ${enq.reference} created`)
    if (row.ai) {
      const c = classify(base)
      enq.ai_classification = c
      enq.ai_summary = summarise(base, c)
      enq.category = c.category
      enq.priority = safety.flagged ? 'Urgent' : c.priority
      enq.requires_human_review = c.requires_human_review
      log(created + 20 * 60000, 'ai_classified', enq, `Classified ${enq.reference} as ${c.category} (demo)`, 'demo')
      log(created + 21 * 60000, 'ai_summarised', enq, `Summary generated for ${enq.reference} (demo)`, 'demo')
      if (row.resp && !safety.flagged) {
        const r = draftResponse(base, c, settings)
        log(created + 40 * 60000, 'response_generated', enq, `Draft response generated for ${enq.reference} (demo)`, 'demo')
        if (row.resp === 'approved') {
          r.body = r.body
            .replace(/^\[DEMO OUTPUT[^\n]*\n\n/, '')
            .replace(/\[STAFF TO CONFIRM: sender name\]/g, 'Front desk team')
            .replace(/\[STAFF TO CONFIRM:[^\]]*\]/g, 'Details to be confirmed by the team')
          r.placeholders = []
          r.approval_status = 'approved_for_manual_sending'
          r.approved_at = new Date(created + 90 * 60000).toISOString()
          log(created + 90 * 60000, 'response_approved', enq, `Response for ${enq.reference} approved for manual sending`)
        }
        enq.ai_response = r
      }
    }
    if (row.st === 'Resolved') {
      log(created + 3 * HOUR, 'status_changed', enq, `${enq.reference} marked Resolved`)
      enq.updated_at = new Date(created + 3 * HOUR).toISOString()
    }
    enquiries.push(enq)
  })
  return { enquiries, activity, counter: enquiries.length }
}

// ---------------------------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------------------------
let cache = null

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    /* storage full or blocked: data lasts for this session only */
  }
}

function load() {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      cache = JSON.parse(raw)
      return cache
    }
  } catch {
    /* fall through to a fresh seed */
  }
  cache = buildSeed()
  persist()
  return cache
}

export function resetDemoData() {
  cache = buildSeed()
  persist()
}

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 160))
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)))

function addActivity(store, action_type, enq, description, ai_mode = 'none') {
  store.activity.push({
    id: makeId(),
    timestamp: new Date().toISOString(),
    action_type,
    enquiry_id: enq.id,
    enquiry_reference: enq.reference,
    description, // never contains message text or patient details
    ai_mode,
  })
}

function find(store, id) {
  const enq = store.enquiries.find((e) => e.id === id)
  if (!enq) throw new ApiError('Enquiry not found.', { status: 404, code: 'not_found' })
  return enq
}

function validationError(details) {
  return new ApiError('Please check the highlighted fields.', { status: 422, code: 'validation_error', details })
}

// ---------------------------------------------------------------------------------------------
// Enquiries
// ---------------------------------------------------------------------------------------------
export async function listEnquiries({ search = '', category = '', status = '', priority = '', has_reminder = '', page = 1, limit = 10 } = {}) {
  await delay()
  const { enquiries } = load()
  const q = search.trim().toLowerCase()
  let items = enquiries.filter((e) => {
    if (q && !`${e.reference} ${e.patient_name} ${e.subject} ${e.message}`.toLowerCase().includes(q)) return false
    if (category && (category === UNCLASSIFIED ? e.category : e.category !== category)) return false
    if (status && e.status !== status) return false
    if (priority && e.priority !== priority) return false
    if (has_reminder && !e.ai_reminder) return false
    return true
  })
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const total = items.length
  const p = Math.max(1, Number(page) || 1)
  const l = Math.min(100, Math.max(1, Number(limit) || 10))
  items = items.slice((p - 1) * l, p * l)
  return clone({ items, total, page: p, limit: l })
}

export async function getEnquiry(id) {
  await delay(120)
  return clone(find(load(), id))
}

export async function createEnquiry(payload) {
  await delay()
  const errors = []
  const name = (payload.patient_name || '').trim()
  const email = (payload.contact_email || '').trim()
  const subject = (payload.subject || '').trim()
  const message = (payload.message || '').trim()
  if (!name) errors.push({ field: 'patient_name', message: 'Enter a fictional patient name.' })
  else if (name.length > LIMITS.name) errors.push({ field: 'patient_name', message: `Keep the name under ${LIMITS.name} characters.` })
  if (!email) errors.push({ field: 'contact_email', message: 'Enter a fictional email address.' })
  else if (!FICTIONAL_EMAIL_RE.test(email)) errors.push({ field: 'contact_email', message: 'Use a fictional address ending in @example.com, @example.org or @example.net.' })
  if (!subject) errors.push({ field: 'subject', message: 'Enter a subject.' })
  else if (subject.length > LIMITS.subject) errors.push({ field: 'subject', message: `Keep the subject under ${LIMITS.subject} characters.` })
  if (message.length < 10) errors.push({ field: 'message', message: 'Write at least 10 characters.' })
  else if (message.length > LIMITS.message) errors.push({ field: 'message', message: `Keep the message under ${LIMITS.message} characters.` })
  if (errors.length) throw validationError(errors)

  const store = load()
  store.counter += 1
  const safety = safetyCheck(`${subject} ${message}`)
  const now = new Date().toISOString()
  const enq = {
    id: makeId(),
    reference: `ENQ-${String(store.counter).padStart(4, '0')}`,
    patient_name: name,
    contact_email: email,
    subject,
    message,
    category: null,
    priority: safety.flagged ? 'Urgent' : 'Normal',
    status: 'New',
    requires_human_review: safety.flagged,
    safety_flags: safety.matches,
    ai_classification: null,
    ai_summary: null,
    ai_response: null,
    ai_reminder: null,
    created_at: now,
    updated_at: now,
  }
  store.enquiries.push(enq)
  addActivity(store, 'enquiry_created', enq, `Enquiry ${enq.reference} created`)
  persist()
  return clone(enq)
}

export async function updateEnquiry(id, patch) {
  await delay(150)
  const store = load()
  const enq = find(store, id)
  const errors = []

  if (patch.status !== undefined && !STATUSES.includes(patch.status)) errors.push({ field: 'status', message: 'Unknown status.' })
  if (patch.priority !== undefined && !PRIORITIES.includes(patch.priority)) errors.push({ field: 'priority', message: 'Unknown priority.' })

  const resp = patch.ai_response
  if (resp) {
    if (!enq.ai_response) throw new ApiError('There is no draft response to update.', { status: 409, code: 'no_draft' })
    if (resp.approval_status === 'approved_for_manual_sending') {
      const body = resp.body ?? enq.ai_response.body
      if (findPlaceholders(body).length) errors.push({ field: 'ai_response.body', message: 'Replace every [STAFF TO CONFIRM] placeholder before approving.' })
      if (hasDemoMarker(body)) errors.push({ field: 'ai_response.body', message: 'Delete the [DEMO OUTPUT] line before approving.' })
    }
  }
  if (errors.length) throw validationError(errors)

  if (patch.status !== undefined && patch.status !== enq.status) {
    enq.status = patch.status
    addActivity(store, 'status_changed', enq, `${enq.reference} marked ${patch.status}`)
  }
  if (patch.priority !== undefined) enq.priority = patch.priority

  if (resp) {
    if (resp.body !== undefined && resp.body !== enq.ai_response.body) {
      enq.ai_response.body = resp.body
      enq.ai_response.placeholders = findPlaceholders(resp.body)
      if (!resp.approval_status) enq.ai_response.approval_status = 'edited'
    }
    if (resp.approval_status) {
      enq.ai_response.approval_status = resp.approval_status
      if (resp.approval_status === 'approved_for_manual_sending') {
        enq.ai_response.approved_at = new Date().toISOString()
        addActivity(store, 'response_approved', enq, `Response for ${enq.reference} approved for manual sending`)
      } else if (resp.approval_status === 'rejected') {
        addActivity(store, 'response_rejected', enq, `Response for ${enq.reference} rejected`)
      }
    }
  }
  enq.updated_at = new Date().toISOString()
  persist()
  return clone(enq)
}

export async function deleteEnquiry(id) {
  await delay(150)
  const store = load()
  const enq = find(store, id)
  store.enquiries = store.enquiries.filter((e) => e.id !== id)
  addActivity(store, 'enquiry_deleted', enq, `Enquiry ${enq.reference} deleted`)
  persist()
  return { deleted: true }
}

// ---------------------------------------------------------------------------------------------
// AI actions (demo engine)
// ---------------------------------------------------------------------------------------------
export async function processEnquiry(id) {
  await delay(700)
  const store = load()
  const enq = find(store, id)
  const c = classify(enq)
  enq.ai_classification = c
  enq.ai_summary = summarise(enq, c)
  enq.category = c.category
  if (c.priority === 'Urgent' || enq.priority !== 'Urgent') enq.priority = c.priority
  enq.requires_human_review = enq.requires_human_review || c.requires_human_review
  if (c.safety_flags.length) enq.safety_flags = [...new Set([...(enq.safety_flags || []), ...c.safety_flags])]
  if (enq.status === 'New') enq.status = 'In Review'
  enq.updated_at = new Date().toISOString()
  addActivity(store, 'ai_classified', enq, `Classified ${enq.reference} as ${c.category} (demo)`, 'demo')
  addActivity(store, 'ai_summarised', enq, `Summary generated for ${enq.reference} (demo)`, 'demo')
  persist()
  return clone(enq)
}

export async function generateResponse(id) {
  await delay(800)
  const store = load()
  const enq = find(store, id)
  if (enq.safety_flags?.length) {
    throw new ApiError('This enquiry is flagged for human review. No draft reply is generated for it.', { status: 409, code: 'urgent_requires_human' })
  }
  if (!enq.ai_classification) {
    throw new ApiError('Process this enquiry with AI before drafting a reply.', { status: 409, code: 'not_processed' })
  }
  enq.ai_response = draftResponse(enq, enq.ai_classification, getClinicSettings())
  enq.updated_at = new Date().toISOString()
  addActivity(store, 'response_generated', enq, `Draft response generated for ${enq.reference} (demo)`, 'demo')
  persist()
  return clone(enq)
}

export async function generateReminder({ enquiry_id, date, time, practitioner, channel }) {
  await delay(700)
  const store = load()
  const enq = find(store, enquiry_id)
  const errors = []
  if (!date) errors.push({ field: 'date', message: 'Choose the appointment date.' })
  if (!time) errors.push({ field: 'time', message: 'Choose the appointment time.' })
  if (!['email', 'sms'].includes(channel)) errors.push({ field: 'channel', message: 'Choose email or SMS.' })
  if (errors.length) throw validationError(errors)
  if (enq.safety_flags?.length) {
    throw new ApiError('This enquiry is flagged for human review. No reminder is generated for it.', { status: 409, code: 'urgent_requires_human' })
  }
  enq.ai_reminder = { ...draftReminder(enq, { date, time, practitioner, channel }, getClinicSettings()), created_at: new Date().toISOString() }
  enq.updated_at = new Date().toISOString()
  addActivity(store, 'reminder_generated', enq, `Reminder draft (${channel}) generated for ${enq.reference} (demo)`, 'demo')
  persist()
  return clone(enq)
}

// ---------------------------------------------------------------------------------------------
// Activity and stats
// ---------------------------------------------------------------------------------------------
export async function listActivity({ action_type = '', page = 1, limit = 15 } = {}) {
  await delay()
  const { activity } = load()
  let items = activity.filter((a) => !action_type || a.action_type === action_type)
  items = [...items].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  const total = items.length
  const p = Math.max(1, Number(page) || 1)
  const l = Math.min(100, Math.max(1, Number(limit) || 15))
  return clone({ items: items.slice((p - 1) * l, p * l), total, page: p, limit: l })
}

function startOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const offset = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - offset)
  return d
}

export async function getStats() {
  await delay(150)
  const { enquiries } = load()
  const open = enquiries.filter((e) => e.status !== 'Resolved')

  const counts = new Map()
  enquiries.forEach((e) => {
    const key = e.category || UNCLASSIFIED
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  const category_breakdown = [...CATEGORIES, UNCLASSIFIED]
    .map((category) => ({ category, count: counts.get(category) || 0 }))
    .filter((c) => c.count > 0)

  const thisWeek = startOfWeek(new Date())
  const weekly = []
  for (let i = 7; i >= 0; i -= 1) {
    const start = new Date(thisWeek)
    start.setDate(start.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const count = enquiries.filter((e) => {
      const t = new Date(e.created_at)
      return t >= start && t < end
    }).length
    weekly.push({
      week_start: start.toISOString(),
      label: start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
      count,
    })
  }

  return {
    total: enquiries.length,
    pending: open.length,
    processed: enquiries.length - open.length,
    urgent_awaiting_review: open.filter((e) => e.requires_human_review && e.safety_flags?.length).length,
    ai_processed: enquiries.filter((e) => e.ai_classification).length,
    category_breakdown,
    weekly,
    generated_at: new Date().toISOString(),
  }
}
