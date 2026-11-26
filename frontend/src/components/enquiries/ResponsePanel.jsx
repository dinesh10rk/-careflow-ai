import { useEffect, useMemo, useState } from 'react'
import Button from '../ui/Button'
import { AiBadge, ApprovalBadge } from '../ui/Badges'
import { InlineAlert } from '../ui/Feedback'
import { ConfirmDialog } from '../ui/Overlays'
import { useToast } from '../ui/ToastProvider'
import { aiService } from '../../services/aiService'
import { enquiryService } from '../../services/enquiryService'
import { findPlaceholders, hasDemoMarker, formatDateTime } from '../../utils/format'

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  throw new Error('Clipboard unavailable')
}

/**
 * Draft reply with the human-approval step.
 * Nothing is ever sent from here: approval only records that a person reviewed the text.
 */
export default function ResponsePanel({ enquiry, onUpdated }) {
  const toast = useToast()
  const response = enquiry.ai_response
  const [text, setText] = useState(response?.body || '')
  const [busy, setBusy] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  useEffect(() => {
    setText(response?.body || '')
    setFieldError('')
  }, [response?.body, enquiry.id])

  const placeholders = useMemo(() => findPlaceholders(text), [text])
  const markerLeft = hasDemoMarker(text)
  const dirty = response ? text !== response.body : false
  const approved = response?.approval_status === 'approved_for_manual_sending'
  const rejected = response?.approval_status === 'rejected'
  const flagged = enquiry.safety_flags?.length > 0

  const run = async (key, fn, successMessage) => {
    setBusy(key)
    setFieldError('')
    try {
      const updated = await fn()
      onUpdated(updated)
      if (successMessage) toast.success(successMessage)
    } catch (err) {
      if (err.status === 422 && err.details?.length) setFieldError(err.details[0].message)
      toast.error(err.message)
    } finally {
      setBusy('')
    }
  }

  const generate = () =>
    run('generate', () => aiService.generateResponse(enquiry.id), 'Draft reply created. It needs your review before use.')

  const save = () =>
    run('save', () => enquiryService.update(enquiry.id, { ai_response: { body: text } }), 'Edits saved.')

  const approve = () =>
    run(
      'approve',
      () => enquiryService.update(enquiry.id, { ai_response: { body: text, approval_status: 'approved_for_manual_sending' } }),
      'Approved for manual sending. Nothing has been sent.',
    )

  const reject = () =>
    run('reject', () => enquiryService.update(enquiry.id, { ai_response: { approval_status: 'rejected' } }), 'Draft rejected.')

  const reopen = () =>
    run('reopen', () => enquiryService.update(enquiry.id, { ai_response: { approval_status: 'edited' } }), 'Draft reopened for editing.')

  const copy = async () => {
    try {
      await copyText(text)
      toast.success('Copied. Paste it into your email system and send it from there.')
    } catch {
      toast.error('Copy failed. Select the text and copy it manually.')
    }
  }

  // ---- States without a draft ----
  if (flagged) {
    return (
      <section className="ai-card" aria-label="Suggested reply">
        <header className="ai-card-head"><h3>Suggested reply</h3></header>
        <InlineAlert tone="warning" title="No draft is generated for flagged enquiries">
          A staff member should reply to this person directly, following the clinic's own process.
        </InlineAlert>
      </section>
    )
  }
  if (!enquiry.ai_classification) {
    return (
      <section className="ai-card" aria-label="Suggested reply">
        <header className="ai-card-head"><h3>Suggested reply</h3></header>
        <p className="muted">Run the AI analysis first. A draft reply is written from the classification.</p>
      </section>
    )
  }
  if (!response) {
    return (
      <section className="ai-card" aria-label="Suggested reply">
        <header className="ai-card-head"><h3>Suggested reply</h3></header>
        <p className="muted">Create a draft that you can edit and approve. It will contain placeholders wherever staff must confirm a detail.</p>
        <Button variant="primary" icon="mail" loading={busy === 'generate'} onClick={generate}>
          Draft a reply
        </Button>
      </section>
    )
  }

  // ---- Draft exists ----
  const canApprove = !approved && !rejected && placeholders.length === 0 && !markerLeft
  return (
    <section className="ai-card" aria-label="Suggested reply">
      <header className="ai-card-head">
        <h3>Suggested reply</h3>
        <AiBadge mode={response.mode} />
      </header>

      <div className="reply-meta">
        <ApprovalBadge status={response.approval_status} />
        <span className="muted">{response.subject}</span>
      </div>

      {approved && (
        <InlineAlert tone="success" title="Approved for manual sending">
          CareFlow AI never sends messages. Copy the text into your email system.
          {response.approved_at && <> Approved {formatDateTime(response.approved_at)}.</>}
        </InlineAlert>
      )}
      {rejected && <InlineAlert tone="warning" title="This draft was rejected">Create a new draft, or reply without AI.</InlineAlert>}

      <textarea
        className="textarea reply-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        readOnly={approved || rejected}
        rows={12}
        aria-label="Draft reply text"
        aria-invalid={fieldError ? true : undefined}
      />
      {fieldError && <p className="field-error">{fieldError}</p>}

      {!approved && !rejected && (placeholders.length > 0 || markerLeft) && (
        <div className="review-checklist">
          <strong>Before you can approve</strong>
          <ul>
            {markerLeft && <li>Delete the [DEMO OUTPUT] line at the top.</li>}
            {placeholders.map((p) => <li key={p}>Replace {p}</li>)}
          </ul>
        </div>
      )}

      <div className="action-row">
        {approved ? (
          <>
            <Button variant="primary" icon="copy" onClick={copy}>Copy text</Button>
            <Button variant="ghost" icon="edit" loading={busy === 'reopen'} onClick={reopen}>Reopen for editing</Button>
          </>
        ) : rejected ? (
          <Button variant="primary" icon="refresh" loading={busy === 'generate'} onClick={generate}>Draft a new reply</Button>
        ) : (
          <>
            <Button variant="primary" icon="check" disabled={!canApprove} loading={busy === 'approve'} onClick={approve}>
              Approve for manual sending
            </Button>
            <Button icon="edit" disabled={!dirty} loading={busy === 'save'} onClick={save}>Save edits</Button>
            <Button variant="ghost" onClick={reject} loading={busy === 'reject'}>Reject</Button>
            <Button variant="ghost" icon="refresh" onClick={() => setConfirmRegenerate(true)}>Redraft</Button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmRegenerate}
        title="Replace this draft?"
        confirmLabel="Create new draft"
        loading={busy === 'generate'}
        onCancel={() => setConfirmRegenerate(false)}
        onConfirm={async () => {
          await generate()
          setConfirmRegenerate(false)
        }}
      >
        Your current text and any edits will be replaced by a new draft.
      </ConfirmDialog>
    </section>
  )
}
