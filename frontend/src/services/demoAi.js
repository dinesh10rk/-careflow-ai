/**
 * Demo AI engine.
 *
 * Deterministic, rule-based sample outputs used ONLY in demo-data mode.
 * Nothing here calls a language model. Every result carries mode: "demo" and every
 * draft starts with a visible [DEMO OUTPUT] marker so it can never be mistaken for live AI.
 */
import { ESCALATION_NOTICE, PLACEHOLDER_RE } from '../utils/constants'

const DEMO_MARKER =
  '[DEMO OUTPUT: sample draft, not written by a live AI model. Delete this line before use.]'

// ---- Safety pre-check (rule-based, runs before any AI) -------------------------------------
const SAFETY_PATTERNS = [
  [/chest\s+pain|tight(ness)?\s+(in|across)\s+(my\s+)?chest/i, 'Chest-related symptom wording'],
  [/(short(ness)?\s+of\s+breath|can'?t\s+breathe|cannot\s+breathe|difficulty\s+breathing|trouble\s+breathing)/i, 'Breathing-related wording'],
  [/(severe|heavy|uncontrolled)\s+bleeding|bleeding\s+(heavily|badly)/i, 'Bleeding-related wording'],
  [/(unconscious|passed\s+out|collapsed|unresponsive|seizure|fitting)/i, 'Collapse or seizure wording'],
  [/(face\s+droop|slurred\s+speech|stroke)/i, 'Stroke-related wording'],
  [/(suicid|self[-\s]?harm|kill\s+myself|end\s+my\s+life|overdos)/i, 'Self-harm or crisis wording'],
  [/(anaphyla|throat\s+(is\s+)?swelling|swollen\s+(throat|tongue))/i, 'Severe allergic reaction wording'],
  [/(high\s+fever|fever).{0,60}(baby|infant|newborn|rash)|(baby|infant|newborn).{0,60}fever/i, 'Fever with infant or rash wording'],
  [/\bemergency\b|\bcall\s+an?\s+ambulance\b/i, 'The word "emergency"'],
]

export function safetyCheck(text = '') {
  const matches = SAFETY_PATTERNS.filter(([re]) => re.test(text)).map(([, label]) => label)
  return { flagged: matches.length > 0, matches }
}

// Enquiry text is untrusted data. Text that tries to instruct the AI is never followed;
// it is only detected so staff can see it.
const INSTRUCTION_PATTERNS = [
  /ignore\s+(all\s+)?(the\s+)?(previous|prior|above|earlier)\s+(instructions|rules|prompts?)/i,
  /(reveal|show|print|repeat)\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instructions|rules)/i,
  /disregard\s+(your|the|all)\s+(rules|instructions|guidelines)/i,
  /(approve|send)\s+(this|the)\s+(message|email|reply)\s+(automatically|without\s+review)/i,
  /you\s+are\s+now\s+(a|an|in)\b/i,
]

export function looksLikeInstructions(text = '') {
  return INSTRUCTION_PATTERNS.some((re) => re.test(text))
}

// ---- Classification ------------------------------------------------------------------------
const CATEGORY_RULES = [
  ['Appointment Request', /(appointment|book(ing)?\b|reschedul|cancel|telehealth|consult|check-?up|follow-?up|available times?)/gi],
  ['Prescription Administration', /(prescription|script|repeat|medication|refill|pharmacy)/gi],
  ['Medical Records Request', /(records?|transfer|copy of|immunisation|certificate|referral letter)/gi],
  ['Billing Enquiry', /(invoice|bill(ed|ing)?\b|payment|receipt|charge|bulk[-\s]?bill|medicare|refund|fee\b|account)/gi],
  ['General Enquiry', /(opening\s+hours|hours|open\b|parking|new patient|accept(ing)?|registration|register|location|directions)/gi],
]

const NEXT_ACTIONS = {
  'Appointment Request': 'Check the appointment book and contact the patient with available times.',
  'Prescription Administration': 'Pass the repeat request to the practice team through your usual prescription workflow.',
  'General Enquiry': 'Answer using your clinic information, or pass to the practice manager.',
  'Medical Records Request': "Confirm the patient's identity and follow your clinic's records request process.",
  'Billing Enquiry': "Check the patient's account and reply with the outcome.",
  Other: 'Review manually and route to the right team member.',
}

export function classify(enquiry) {
  const text = `${enquiry.subject} ${enquiry.message}`
  const safety = safetyCheck(text)

  let best = { category: 'Other', hits: [] }
  for (const [category, re] of CATEGORY_RULES) {
    const hits = [...new Set((text.match(re) || []).map((h) => h.toLowerCase()))]
    if (hits.length > best.hits.length) best = { category, hits }
  }

  let priority = 'Normal'
  if (/\b(urgent|asap|today|tomorrow|this week|running out|ran out|end of this week)\b/i.test(text)) priority = 'High'
  else if (/\b(no rush|whenever|no hurry|not urgent)\b/i.test(text) || best.category === 'General Enquiry') priority = 'Low'
  if (safety.flagged) priority = 'Urgent'

  const injection = looksLikeInstructions(text)

  const explanation = safety.flagged
    ? 'Wording in this message may relate to an urgent or emergency situation. It has been flagged for immediate human review. This tool does not assess medical urgency.'
    : injection
      ? 'This message contains text that tries to give instructions to the AI. It was treated as ordinary enquiry text and not followed. Flagged for human review.'
      : best.hits.length
        ? `Demo rules matched administrative keywords (${best.hits.slice(0, 4).join(', ')}).`
        : 'No administrative keywords matched, so this was filed as Other.'

  return {
    category: best.category,
    priority,
    explanation,
    next_action: safety.flagged
      ? "Escalate to a staff member or clinician now, following your clinic's emergency protocol."
      : NEXT_ACTIONS[best.category],
    requires_human_review: safety.flagged || injection || best.category === 'Other',
    safety_flags: safety.matches,
    instruction_text_detected: injection,
    mode: 'demo',
  }
}

// ---- Summarisation -------------------------------------------------------------------------
const MISSING_BY_CATEGORY = {
  'Appointment Request': ['Preferred practitioner', 'Preferred days and times', 'Best contact number'],
  'Prescription Administration': ['Medication name (to be confirmed by staff)', 'Date of last prescription', 'Preferred pharmacy'],
  'General Enquiry': [],
  'Medical Records Request': ['Destination practice or recipient', 'Signed consent', 'Date of birth for identity check'],
  'Billing Enquiry': ['Invoice number', 'Date of visit'],
  Other: ['Clear description of what the patient needs'],
}
const REQUEST_BY_CATEGORY = {
  'Appointment Request': 'Book or change an appointment.',
  'Prescription Administration': 'Arrange a repeat prescription through the practice.',
  'General Enquiry': 'Get general information about the clinic.',
  'Medical Records Request': 'Obtain or transfer medical records.',
  'Billing Enquiry': 'Query a charge or request a receipt.',
  Other: 'Unclear; needs staff to interpret.',
}

export function summarise(enquiry, classification) {
  const category = classification?.category || classify(enquiry).category
  const text = `${enquiry.subject} ${enquiry.message}`
  const supplied = []
  const practitioner = text.match(/\bDr\.?\s+[A-Z][a-z]+/)
  if (practitioner) supplied.push(`Practitioner mentioned: ${practitioner[0]}`)
  const timing = text.match(/\b(next week|this week|tomorrow|today|morning|afternoon|evening|monday|tuesday|wednesday|thursday|friday|saturday)\b/i)
  if (timing) supplied.push(`Timing mentioned: ${timing[0].toLowerCase()}`)
  const dateMention = text.match(/\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i)
  if (dateMention) supplied.push(`Date mentioned: ${dateMention[0]}`)
  if (enquiry.contact_email) supplied.push('Contact email provided')

  let missing = [...MISSING_BY_CATEGORY[category]]
  if (practitioner) missing = missing.filter((m) => m !== 'Preferred practitioner')
  if (timing) missing = missing.filter((m) => m !== 'Preferred days and times')
  if (dateMention) missing = missing.filter((m) => m !== 'Date of visit')

  const firstSentence = enquiry.message.split(/(?<=[.!?])\s/)[0]
  return {
    summary: `${enquiry.patient_name} wrote about "${enquiry.subject}". ${firstSentence}`.slice(0, 280),
    main_request: REQUEST_BY_CATEGORY[category],
    information_supplied: supplied,
    missing_information: missing,
    recommended_follow_up:
      missing.length > 0
        ? `Reply to the patient and ask for: ${missing.join(', ').toLowerCase()}.`
        : 'Reply to the patient with the requested information.',
    mode: 'demo',
  }
}

// ---- Drafts --------------------------------------------------------------------------------
const BODY_BY_CATEGORY = {
  'Appointment Request':
    'Thank you for getting in touch about an appointment. Our team has received your request and will check availability.\n\n[STAFF TO CONFIRM: available appointment times and practitioner]\n\nWe will contact you to confirm a time that suits you.',
  'Prescription Administration':
    'Thank you for your message about a repeat prescription. We have passed your request to the practice team for review.\n\n[STAFF TO CONFIRM: how repeat prescription requests are handled and the expected turnaround]\n\nIf anything further is needed from you, we will be in touch.',
  'General Enquiry':
    'Thank you for contacting us.\n\n[STAFF TO CONFIRM: answer to the patient\'s question]\n\nPlease let us know if there is anything else we can help with.',
  'Medical Records Request':
    'Thank you for your request regarding medical records. We will need to confirm your identity before any records can be released.\n\n[STAFF TO CONFIRM: records request process and any consent form required]\n\nWe will be in touch once we have reviewed your request.',
  'Billing Enquiry':
    'Thank you for your message about your account. We have asked our team to review it and will reply with the outcome.\n\n[STAFF TO CONFIRM: account details and any amount owing or refunded]\n\nWe appreciate your patience.',
  Other:
    'Thank you for contacting us. Your message has been received and a member of our team will review it.\n\n[STAFF TO CONFIRM: reply to the patient\'s request]\n\nWe will be in touch soon.',
}

function signOff(settings) {
  const sender = settings.senderName?.trim() || '[STAFF TO CONFIRM: sender name]'
  return `Kind regards,\n${sender}\n${settings.clinicName}`
}

export function extractPlaceholders(text = '') {
  return [...new Set(text.match(PLACEHOLDER_RE) || [])]
}

export function draftResponse(enquiry, classification, settings) {
  const category = classification?.category || 'Other'
  const first = enquiry.patient_name.split(/\s+/)[0]
  const body = [
    DEMO_MARKER,
    '',
    `Dear ${first},`,
    '',
    BODY_BY_CATEGORY[category],
    '',
    signOff(settings),
  ].join('\n')
  return {
    subject: `Re: ${enquiry.subject}`,
    body,
    placeholders: extractPlaceholders(body),
    approval_status: 'draft',
    approved_at: null,
    mode: 'demo',
  }
}

export function draftReminder(enquiry, details, settings) {
  const first = enquiry.patient_name.split(/\s+/)[0]
  const when = new Date(`${details.date}T${details.time || '09:00'}`)
  const dateText = when.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeText = when.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
  const withWho = details.practitioner?.trim() ? ` with ${details.practitioner.trim()}` : ''

  let body
  let subject = null
  if (details.channel === 'sms') {
    body = `${DEMO_MARKER}\n\nHi ${first}, a reminder of your appointment${withWho} on ${dateText} at ${timeText} at ${settings.clinicName}. To change it, call [STAFF TO CONFIRM: clinic phone number].`
  } else {
    subject = `Appointment reminder: ${settings.clinicName}`
    body = [
      DEMO_MARKER,
      '',
      `Dear ${first},`,
      '',
      `This is a reminder of your upcoming appointment${withWho} on ${dateText} at ${timeText}.`,
      '',
      '[STAFF TO CONFIRM: clinic address and arrival instructions]',
      '',
      'If you need to change or cancel, please contact us on [STAFF TO CONFIRM: clinic phone number].',
      '',
      signOff(settings),
    ].join('\n')
  }
  return {
    channel: details.channel,
    subject,
    body,
    appointment: { date: details.date, time: details.time, practitioner: details.practitioner || '' },
    placeholders: extractPlaceholders(body),
    mode: 'demo',
  }
}

export { ESCALATION_NOTICE }
