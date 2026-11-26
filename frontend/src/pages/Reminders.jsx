import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import Icon from '../components/ui/Icon'
import { AiBadge } from '../components/ui/Badges'
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '../components/ui/Feedback'
import { useToast } from '../components/ui/ToastProvider'
import { useAsync } from '../hooks/useAsync'
import { aiService } from '../services/aiService'
import { enquiryService } from '../services/enquiryService'
import { findPlaceholders, hasDemoMarker, relativeTime, todayISODate, truncate } from '../utils/format'

export default function Reminders() {
  const toast = useToast()
  const enquiries = useAsync(() => enquiryService.list({ limit: 100 }), [])
  const recent = useAsync(() => enquiryService.list({ has_reminder: 'true', limit: 6 }), [])

  const [form, setForm] = useState({ enquiry_id: '', date: '', time: '09:00', practitioner: '', channel: 'email' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState(null) // { enquiry, reminder }
  const [text, setText] = useState('')

  const eligible = useMemo(
    () => (enquiries.data?.items || []).filter((e) => !(e.safety_flags?.length > 0) && e.status !== 'Resolved'),
    [enquiries.data],
  )

  // Appointment requests first, since they are the likeliest to need a reminder.
  const sorted = useMemo(
    () => [...eligible].sort((a, b) => Number(b.category === 'Appointment Request') - Number(a.category === 'Appointment Request')),
    [eligible],
  )

  useEffect(() => setText(draft?.reminder.body || ''), [draft])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (!form.enquiry_id) found.enquiry_id = 'Choose the enquiry this reminder is for.'
    if (!form.date) found.date = 'Choose the appointment date.'
    if (!form.time) found.time = 'Choose the appointment time.'
    setErrors(found)
    if (Object.keys(found).length) return

    setBusy(true)
    try {
      const updated = await aiService.generateReminder(form)
      setDraft({ enquiry: updated, reminder: updated.ai_reminder })
      recent.reload({ silent: true })
      toast.success('Reminder drafted. Review it before use.')
    } catch (err) {
      if (err.status === 422 && err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])))
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const placeholders = findPlaceholders(text)
  const markerLeft = hasDemoMarker(text)
  const ready = placeholders.length === 0 && !markerLeft

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied. Send it from your own email or SMS system.')
    } catch {
      toast.error('Copy failed. Select the text and copy it manually.')
    }
  }

  return (
    <>
      <PageHeader
        title="Appointment reminders"
        description="Draft a reminder for staff to review. CareFlow AI never sends messages, and it does not invent clinic details."
      />

      <div className="assistant-grid">
        <section className="card" aria-labelledby="rem-title">
          <header className="card-head">
            <div>
              <h2 id="rem-title" className="card-title">Appointment details</h2>
              <p className="card-sub">Confirm these with the appointment book first</p>
            </div>
          </header>

          {enquiries.error ? (
            <ErrorState error={enquiries.error} onRetry={enquiries.reload} title="Could not load enquiries" />
          ) : enquiries.loading ? (
            <div className="form-stack"><Skeleton height={44} radius={10} /><Skeleton height={44} radius={10} /><Skeleton height={44} radius={10} /></div>
          ) : sorted.length === 0 ? (
            <EmptyState icon="inbox" title="No open enquiries to attach a reminder to" action={<Link className="btn btn-primary btn-md" to="/assistant">Add an enquiry</Link>}>
              Reminders are linked to an enquiry. Flagged and resolved enquiries are left out.
            </EmptyState>
          ) : (
            <form onSubmit={submit} noValidate className="form-stack">
              <Field label="Enquiry" error={errors.enquiry_id}>
                {(p) => (
                  <select {...p} className="select" value={form.enquiry_id} onChange={set('enquiry_id')}>
                    <option value="">Choose an enquiry</option>
                    {sorted.map((e) => (
                      <option key={e.id} value={e.id}>{e.reference} · {e.patient_name} · {truncate(e.subject, 36)}</option>
                    ))}
                  </select>
                )}
              </Field>
              <div className="form-row">
                <Field label="Date" error={errors.date}>
                  {(p) => <input {...p} className="input" type="date" min={todayISODate()} value={form.date} onChange={set('date')} />}
                </Field>
                <Field label="Time" error={errors.time}>
                  {(p) => <input {...p} className="input" type="time" value={form.time} onChange={set('time')} />}
                </Field>
              </div>
              <Field label="Practitioner (optional)" hint="Use a fictional name, for example Dr Patel.">
                {(p) => <input {...p} className="input" value={form.practitioner} onChange={set('practitioner')} maxLength={80} placeholder="Dr Patel" />}
              </Field>
              <fieldset className="radio-group">
                <legend>Send by</legend>
                {[['email', 'Email', 'mail'], ['sms', 'SMS', 'message']].map(([value, label, icon]) => (
                  <label key={value} className={`radio-card ${form.channel === value ? 'is-checked' : ''}`}>
                    <input type="radio" name="channel" value={value} checked={form.channel === value} onChange={set('channel')} />
                    <Icon name={icon} size={17} />
                    {label}
                  </label>
                ))}
              </fieldset>
              <div className="action-row">
                <Button type="submit" variant="primary" icon="bell" loading={busy}>Draft reminder</Button>
              </div>
            </form>
          )}
        </section>

        <div className="assistant-results" aria-live="polite">
          {draft ? (
            <section className="ai-card" aria-label="Reminder draft">
              <header className="ai-card-head">
                <h3>{draft.enquiry.reference} · {draft.reminder.channel === 'sms' ? 'SMS' : 'Email'} draft</h3>
                <AiBadge mode={draft.reminder.mode} />
              </header>
              {draft.reminder.subject && <p className="reply-meta"><span className="muted">Subject:</span> {draft.reminder.subject}</p>}
              <textarea className="textarea reply-text" rows={draft.reminder.channel === 'sms' ? 6 : 12} value={text} onChange={(e) => setText(e.target.value)} aria-label="Reminder text" />
              {!ready ? (
                <div className="review-checklist">
                  <strong>Before you copy this</strong>
                  <ul>
                    {markerLeft && <li>Delete the [DEMO OUTPUT] line at the top.</li>}
                    {placeholders.map((p) => <li key={p}>Replace {p}</li>)}
                  </ul>
                </div>
              ) : (
                <InlineAlert tone="success" title="Ready to copy">Edits on this page are not saved. Copy the text into your messaging system.</InlineAlert>
              )}
              <div className="action-row">
                <Button variant="primary" icon="copy" disabled={!ready} onClick={copy}>Copy text</Button>
              </div>
            </section>
          ) : (
            <section className="card">
              <EmptyState icon="bell" title="Your draft appears here">
                Choose an enquiry and the appointment details, then draft the reminder. You will edit it, fill any placeholders, and copy it out.
              </EmptyState>
            </section>
          )}

          <section className="card" aria-labelledby="recent-rem">
            <header className="card-head">
              <div><h2 id="recent-rem" className="card-title">Recent reminder drafts</h2></div>
            </header>
            {recent.loading ? (
              <Skeleton height={48} radius={10} />
            ) : recent.error ? (
              <ErrorState error={recent.error} onRetry={recent.reload} title="Could not load reminders" />
            ) : recent.data.items.length === 0 ? (
              <p className="muted">No reminder drafts yet.</p>
            ) : (
              <ul className="recent-list">
                {recent.data.items.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => setDraft({ enquiry: e, reminder: e.ai_reminder })}>
                      <Icon name={e.ai_reminder.channel === 'sms' ? 'message' : 'mail'} size={16} />
                      <span><strong>{e.reference}</strong> {e.patient_name}</span>
                      <span className="muted">{relativeTime(e.ai_reminder.created_at || e.updated_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
