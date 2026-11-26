import { useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import Icon from '../components/ui/Icon'
import { InlineAlert } from '../components/ui/Feedback'
import { ConfirmDialog } from '../components/ui/Overlays'
import { useToast } from '../components/ui/ToastProvider'
import { API_BASE_URL, getClinicSettings, getDataSource, saveClinicSettings, setDataSource } from '../config'
import { healthService } from '../services/activityService'
import { resetDemoData } from '../services/mockApi'

const PRINCIPLES = [
  'Only fictional patient information is used. Real health information must never be entered.',
  'The AI does not diagnose, give medical advice or judge how urgent a symptom is.',
  'Messages with possible urgent wording are flagged for a person and get no AI reply.',
  'Every AI reply needs staff review and approval. Nothing is sent automatically.',
  'API keys stay on the backend and are never placed in this app.',
]

export default function Settings() {
  const toast = useToast()
  const source = getDataSource()
  const [clinic, setClinic] = useState(getClinicSettings())
  const [test, setTest] = useState({ state: 'idle' })
  const [confirmReset, setConfirmReset] = useState(false)

  const switchSource = (value) => {
    if (value === source) return
    setDataSource(value)
    window.location.reload()
  }

  const runTest = async () => {
    setTest({ state: 'loading' })
    try {
      setTest({ state: 'done', data: await healthService.get() })
    } catch (error) {
      setTest({ state: 'error', error })
    }
  }

  const saveClinic = (e) => {
    e.preventDefault()
    const name = clinic.clinicName.trim()
    if (!name) {
      toast.error('Enter a clinic name.')
      return
    }
    saveClinicSettings({ clinicName: name, senderName: clinic.senderName.trim() })
    toast.success('Saved. Name changes show in the sidebar after a refresh.')
  }

  const doReset = () => {
    resetDemoData()
    setConfirmReset(false)
    toast.success('Demo data reset to the original fictional records.')
  }

  return (
    <>
      <PageHeader title="Settings" description="Choose where data comes from, check the backend, and set the clinic details used in drafts." />

      <div className="settings-grid">
        <section className="card" aria-labelledby="conn-title">
          <header className="card-head">
            <div>
              <h2 id="conn-title" className="card-title">Data source</h2>
              <p className="card-sub">Switching reloads the app</p>
            </div>
          </header>

          <fieldset className="radio-stack">
            <legend className="sr-only">Data source</legend>
            <label className={`radio-row ${source === 'mock' ? 'is-checked' : ''}`}>
              <input type="radio" name="source" checked={source === 'mock'} onChange={() => switchSource('mock')} />
              <span>
                <strong>Demo data in this browser</strong>
                <small>Fictional records and rule-based sample AI. Works without a backend.</small>
              </span>
            </label>
            <label className={`radio-row ${source === 'api' ? 'is-checked' : ''}`}>
              <input type="radio" name="source" checked={source === 'api'} onChange={() => switchSource('api')} />
              <span>
                <strong>FastAPI backend</strong>
                <small>Uses {API_BASE_URL}. Needs the enquiry, stats, activity and AI endpoints; if the backend lacks any of them, requests fail with a clear error.</small>
              </span>
            </label>
          </fieldset>

          <div className="test-box">
            <div className="test-head">
              <div>
                <strong>Backend health</strong>
                <p className="muted">Calls {API_BASE_URL}/health</p>
              </div>
              <Button icon="pulse" loading={test.state === 'loading'} onClick={runTest}>Test connection</Button>
            </div>
            {test.state === 'error' && <InlineAlert tone="danger" title="Could not reach the backend">{test.error.message}</InlineAlert>}
            {test.state === 'done' && (
              <dl className="kv kv-stack">
                <div><dt>Overall</dt><dd>{test.data.status === 'ok' ? 'OK' : 'Degraded'}</dd></div>
                <div><dt>Database</dt><dd>{test.data.database?.status}{test.data.database?.database ? ` (${test.data.database.database})` : ''}</dd></div>
                <div><dt>AI mode</dt><dd>{test.data.ai?.mode}</dd></div>
                <div><dt>Note</dt><dd>{test.data.ai?.note}</dd></div>
              </dl>
            )}
          </div>
        </section>

        <section className="card" aria-labelledby="clinic-title">
          <header className="card-head">
            <div>
              <h2 id="clinic-title" className="card-title">Clinic details</h2>
              <p className="card-sub">Used in the sign-off of draft replies</p>
            </div>
          </header>
          <form onSubmit={saveClinic} className="form-stack" noValidate>
            <Field label="Clinic name">
              {(p) => <input {...p} className="input" value={clinic.clinicName} onChange={(e) => setClinic({ ...clinic, clinicName: e.target.value })} maxLength={80} />}
            </Field>
            <Field label="Sender name (optional)" hint="Leave blank to have drafts ask staff to confirm who is sending.">
              {(p) => <input {...p} className="input" value={clinic.senderName} onChange={(e) => setClinic({ ...clinic, senderName: e.target.value })} maxLength={80} placeholder="e.g. Front desk team" />}
            </Field>
            <div className="action-row"><Button type="submit" variant="primary">Save details</Button></div>
          </form>
          <p className="muted settings-note">Stored in this browser. In API mode, drafts use the clinic details held by the backend.</p>
        </section>

        <section className="card" aria-labelledby="demo-title">
          <header className="card-head">
            <div>
              <h2 id="demo-title" className="card-title">Demo data</h2>
              <p className="card-sub">Only affects records stored in this browser</p>
            </div>
          </header>
          <p className="muted">Restore the original fictional enquiries and clear anything you added or changed.</p>
          <div className="action-row">
            <Button icon="refresh" onClick={() => setConfirmReset(true)}>Reset demo data</Button>
          </div>
        </section>

        <section className="card" aria-labelledby="safe-title">
          <header className="card-head">
            <div>
              <h2 id="safe-title" className="card-title">Safety principles</h2>
              <p className="card-sub">How CareFlow AI is designed to behave</p>
            </div>
          </header>
          <ul className="principles">
            {PRINCIPLES.map((p) => (
              <li key={p}><Icon name="shield" size={16} /><span>{p}</span></li>
            ))}
          </ul>
        </section>
      </div>

      <ConfirmDialog open={confirmReset} title="Reset demo data?" confirmLabel="Reset" danger onCancel={() => setConfirmReset(false)} onConfirm={doReset}>
        Everything you added or changed in demo mode will be replaced by the original fictional records.
      </ConfirmDialog>
    </>
  )
}
