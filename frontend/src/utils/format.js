import { PLACEHOLDER_RE, DEMO_MARKER_RE } from './constants'

const dateFmt = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })

export function formatDate(value) {
  if (!value) return ''
  return dateFmt.format(new Date(value))
}

export function formatDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  return `${dateFmt.format(d)}, ${timeFmt.format(d).toLowerCase()}`
}

export function relativeTime(value) {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`
  return formatDate(value)
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

export function truncate(text = '', max = 80) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

export function findPlaceholders(text = '') {
  return text.match(PLACEHOLDER_RE) || []
}

export function hasDemoMarker(text = '') {
  return DEMO_MARKER_RE.test(text)
}

export function todayISODate() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
