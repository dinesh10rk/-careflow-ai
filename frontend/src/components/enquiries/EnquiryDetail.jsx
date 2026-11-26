import { useEffect, useState } from 'react'
import Button from '../ui/Button'
import { CategoryBadge, PriorityBadge, StatusBadge, AiBadge } from '../ui/Badges'
import { ErrorState, Skeleton } from '../ui/Feedback'
import { ConfirmDialog } from '../ui/Overlays'
import { useToast } from '../ui/ToastProvider'
import { ClassificationCard, EscalationNotice, SummaryCard } from './AiCards'
import ResponsePanel from './ResponsePanel'
import { useAsync } from '../../hooks/useAsync'
import { aiService } from '../../services/aiService'
import { enquiryService } from '../../services/enquiryService'
import { STATUSES } from '../../utils/constants'
import { formatDateTime } from '../../utils/format'

export function DetailSkeleton() {
  return (
    <div className="detail-skeleton" aria-busy="true">
      <Skeleton height={22} width="60%" />
      <Skeleton height={14} width="40%" />
      <Skeleton height={96} radius={12} />
      <Skeleton height={140} radius={12} />
    </div>
  )
}

export default function EnquiryDetail({ id, onChanged, onDeleted }) {
  const toast = useToast()
  const { data, error, loading, reload } = useAsync(() => enquiryService.get(id), [id])
  const [enq, setEnq] = useState(null)
  const [busy, setBusy] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => setEnq(data), [data])

  const apply = (updated) => {
    setEnq(updated)
    onChanged?.()
  }

  if (loading && !enq) return <DetailSkeleton />
  if (error) return <ErrorState error={error} onRetry={reload} title="Could not load this enquiry" />
  if (!enq) return null

  const flagged = enq.safety_flags?.length > 0

  const changeStatus = async (status) => {
    setBusy('status')
    try {
      apply(await enquiryService.update(enq.id, { status }))
      toast.success(`Status changed to ${status}.`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy('')
    }
  }

  const process = async () => {
    setBusy('process')
    try {
      const updated = await aiService.processEnquiry(enq.id)
      apply(updated)
      toast.success(updated.ai_classification?.mode === 'demo' ? 'Analysis finished (demo output).' : 'Analysis finished.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy('')
    }
  }

  const remove = async () => {
    setBusy('delete')
    try {
      await enquiryService.remove(enq.id)
      toast.success(`${enq.reference} deleted.`)
      setConfirmDelete(false)
      onDeleted?.()
    } catch (err) {
      toast.error(err.message)
      setBusy('')
    }
  }

  return (
    <div className="detail">
      <div className="detail-top">
        <div className="detail-badges">
          <StatusBadge status={enq.status} />
          <PriorityBadge priority={enq.priority} />
          <CategoryBadge category={enq.category} />
        </div>
        <h3 className="detail-subject">{enq.subject}</h3>
        <p className="detail-from">
          {enq.patient_name} · {enq.contact_email} · received {formatDateTime(enq.created_at)}
        </p>
      </div>

      {flagged && <EscalationNotice enquiry={enq} />}

      <section className="message-box" aria-label="Original message">
        <h4>Message</h4>
        <p>{enq.message}</p>
      </section>

      <div className="detail-controls">
        <label className="inline-field">
          <span>Status</span>
          <select className="select" value={enq.status} disabled={busy === 'status'} onChange={(e) => changeStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <Button
          variant={enq.ai_classification ? 'secondary' : 'primary'}
          icon="sparkles"
          loading={busy === 'process'}
          onClick={process}
        >
          {enq.ai_classification ? 'Run analysis again' : 'Analyse with AI'}
        </Button>
      </div>

      <ClassificationCard enquiry={enq} />
      <SummaryCard enquiry={enq} />
      <ResponsePanel enquiry={enq} onUpdated={apply} />

      {enq.ai_reminder && (
        <section className="ai-card" aria-label="Appointment reminder draft">
          <header className="ai-card-head">
            <h3>Appointment reminder draft</h3>
            <AiBadge mode={enq.ai_reminder.mode} />
          </header>
          <p className="muted">{enq.ai_reminder.channel === 'sms' ? 'SMS' : 'Email'} · for staff review before use</p>
          <pre className="draft-pre">{enq.ai_reminder.body}</pre>
        </section>
      )}

      <div className="danger-zone">
        <Button variant="ghost" icon="trash" onClick={() => setConfirmDelete(true)} className="text-danger">
          Delete enquiry
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        danger
        title={`Delete ${enq.reference}?`}
        confirmLabel="Delete enquiry"
        loading={busy === 'delete'}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      >
        This removes the enquiry and its AI results. The activity log keeps a record that it was deleted.
      </ConfirmDialog>
    </div>
  )
}
