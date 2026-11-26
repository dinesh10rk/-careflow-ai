import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import Icon from '../components/ui/Icon'
import { InlineAlert } from '../components/ui/Feedback'
import { useToast } from '../components/ui/ToastProvider'
import { ClassificationCard, EscalationNotice, SummaryCard } from '../components/enquiries/AiCards'
import ResponsePanel from '../components/enquiries/ResponsePanel'
import { aiService } from '../services/aiService'
import { enquiryService } from '../services/enquiryService'
import { FICTIONAL_EMAIL_RE, LIMITS, SAMPLE_ENQUIRIES } from '../utils/constants'

const EMPTY = { patient_name: '', contact_email: '', subject: '', message: '' }

function validate(form) {
  const e = {}
  if (!form.patient_name.trim()) e.patient_name = 'Enter a fictional patient name.'
  if (!form.contact_email.trim()) e.contact_email = 'Enter a fictional email address.'
  else if (!FICTIONAL_EMAIL_RE.test(form.contact_email.trim())) e.contact_email = 'Use a fictional address ending in @example.com, @example.org or @example.net.'
  if (!form.subject.trim()) e.subject = 'Enter a subject.'
  if (form.message.trim().length < 10) e.message = 'Write at least 10 characters.'
  return e
}

export default function AiAssistant() {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [enquiry, setEnquiry] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }))
  }

  const useSample = (sample) => {
    const { label, ...fields } = sample
    setForm(fields)
    setErrors({})
  }

  const analyse = async (e) => {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) {
      toast.error('Check the highlighted fields.')
      return
    }
    setBusy(true)
    let created = null
    try {
      created = await enquiryService.create(form)
      setEnquiry(created)
      const processed = await aiService.processEnquiry(created.id)
      setEnquiry(processed)
      toast.success(processed.ai_classification?.mode === 'demo' ? 'Analysis finished (demo output).' : 'Analysis finished.')
    } catch (err) {
      if (err.status === 422 && err.details) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])))
      }
      toast.error(created ? `Saved as ${created.reference}, but the analysis failed: ${err.message}` : err.message)
    } finally {
      setBusy(false)
    }
  }

  const retryAnalysis = async () => {
    setBusy(true)
    try {
      setEnquiry(await aiService.processEnquiry(enquiry.id))
      toast.success('Analysis finished.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    setForm(EMPTY)
    setErrors({})
    setEnquiry(null)
  }

  const flagged = enquiry?.safety_flags?.length > 0

  return (
    <>
      <PageHeader
        title="AI Assistant"
        description="Paste a fictional patient enquiry. The assistant classifies it, summarises it and drafts a reply. You review and approve everything."
      />

      <div className="assistant-grid">
        <section className="card" aria-labelledby="submit-title">
          <header className="card-head">
            <div>
              <h2 id="submit-title" className="card-title">Submit an enquiry</h2>
              <p className="card-sub">Fictional details only</p>
            </div>
          </header>

          <InlineAlert tone="info" title="Do not enter real patient information">
            Use made-up names and an email ending in @example.com. This demonstration must never hold real health information.
          </InlineAlert>

          <div className="sample-row">
            <span className="muted">Try a sample</span>
            {SAMPLE_ENQUIRIES.map((s) => (
              <button type="button" key={s.label} className="chip" onClick={() => useSample(s)} disabled={busy}>
                {s.label}
              </button>
            ))}
          </div>

          <form onSubmit={analyse} noValidate className="form-stack">
            <div className="form-row">
              <Field label="Patient name" error={errors.patient_name}>
                {(p) => <input {...p} className="input" value={form.patient_name} onChange={set('patient_name')} maxLength={LIMITS.name} autoComplete="off" placeholder="e.g. Priya Raman" />}
              </Field>
              <Field label="Contact email" error={errors.contact_email}>
                {(p) => <input {...p} className="input" type="email" value={form.contact_email} onChange={set('contact_email')} autoComplete="off" placeholder="name@example.com" />}
              </Field>
            </div>
            <Field label="Subject" error={errors.subject}>
              {(p) => <input {...p} className="input" value={form.subject} onChange={set('subject')} maxLength={LIMITS.subject} placeholder="What is the enquiry about?" />}
            </Field>
            <Field label="Message" error={errors.message} counter={`${form.message.length} / ${LIMITS.message}`}>
              {(p) => <textarea {...p} className="textarea" rows={7} value={form.message} onChange={set('message')} maxLength={LIMITS.message} placeholder="Paste or type the patient's message" />}
            </Field>
            <div className="action-row">
              <Button type="submit" variant="primary" icon="sparkles" loading={busy}>
                Analyse with AI
              </Button>
              <Button variant="ghost" onClick={reset} disabled={busy}>Clear</Button>
            </div>
          </form>
        </section>

        <div className="assistant-results" aria-live="polite">
          {!enquiry ? (
            <section className="card how-card">
              <h2 className="card-title">What happens next</h2>
              <ol className="steps">
                <li>
                  <span className="step-num">1</span>
                  <div><strong>The enquiry is saved</strong><p>A rule-based safety check looks for urgent wording before anything else.</p></div>
                </li>
                <li>
                  <span className="step-num">2</span>
                  <div><strong>AI sorts and summarises it</strong><p>You see the category, priority, what is missing and a suggested next step.</p></div>
                </li>
                <li>
                  <span className="step-num">3</span>
                  <div><strong>You review the draft reply</strong><p>Edit it, fill every placeholder, then approve. Nothing is ever sent for you.</p></div>
                </li>
              </ol>
            </section>
          ) : (
            <>
              <div className="result-head">
                <div>
                  <h2 className="card-title">{enquiry.reference}</h2>
                  <p className="card-sub">{enquiry.subject}</p>
                </div>
                <div className="result-actions">
                  <Link className="link" to={`/enquiries?open=${enquiry.id}`}>Open in Enquiries</Link>
                  <Button variant="secondary" icon="plus" onClick={reset}>Add another</Button>
                </div>
              </div>

              {flagged && <EscalationNotice enquiry={enquiry} />}

              {!enquiry.ai_classification ? (
                <section className="ai-card">
                  <p className="muted">The enquiry was saved, but the analysis did not finish.</p>
                  <Button variant="primary" icon="refresh" loading={busy} onClick={retryAnalysis}>Run analysis again</Button>
                </section>
              ) : (
                <>
                  <ClassificationCard enquiry={enquiry} />
                  <SummaryCard enquiry={enquiry} />
                  <ResponsePanel enquiry={enquiry} onUpdated={setEnquiry} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
