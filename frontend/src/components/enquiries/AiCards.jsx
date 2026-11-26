import { AiBadge, CategoryBadge, PriorityBadge } from '../ui/Badges'
import { InlineAlert } from '../ui/Feedback'
import { ESCALATION_NOTICE } from '../../utils/constants'

export function EscalationNotice({ enquiry }) {
  const flags = enquiry.safety_flags || enquiry.ai_classification?.safety_flags || []
  return (
    <InlineAlert tone="danger" title="Flagged for human review" className="escalation">
      <p>{ESCALATION_NOTICE}</p>
      {flags.length > 0 && (
        <p className="escalation-flags">
          Detected by the rule-based check: {flags.join('; ')}.
        </p>
      )}
    </InlineAlert>
  )
}

export function ClassificationCard({ enquiry }) {
  const c = enquiry.ai_classification
  if (!c) return null
  return (
    <section className="ai-card" aria-label="AI classification">
      <header className="ai-card-head">
        <h3>Classification</h3>
        <AiBadge mode={c.mode} />
      </header>
      <dl className="kv">
        <div>
          <dt>Category</dt>
          <dd><CategoryBadge category={c.category} /></dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd><PriorityBadge priority={c.priority} /></dd>
        </div>
        <div>
          <dt>Human review</dt>
          <dd>{c.requires_human_review ? <strong className="text-danger">Required</strong> : 'Not flagged'}</dd>
        </div>
      </dl>
      <p className="ai-line"><span>Why</span>{c.explanation}</p>
      <p className="ai-line"><span>Suggested next step</span>{c.next_action}</p>
    </section>
  )
}

export function SummaryCard({ enquiry }) {
  const s = enquiry.ai_summary
  if (!s) return null
  return (
    <section className="ai-card" aria-label="AI summary">
      <header className="ai-card-head">
        <h3>Summary</h3>
        <AiBadge mode={s.mode} />
      </header>
      <p className="ai-summary-text">{s.summary}</p>
      <p className="ai-line"><span>Main request</span>{s.main_request}</p>

      <div className="ai-lists">
        <div>
          <h4>Information supplied</h4>
          {s.information_supplied.length ? (
            <ul>{s.information_supplied.map((i) => <li key={i}>{i}</li>)}</ul>
          ) : (
            <p className="muted">Nothing specific beyond the message.</p>
          )}
        </div>
        <div>
          <h4>Still needed</h4>
          {s.missing_information.length ? (
            <ul>{s.missing_information.map((i) => <li key={i}>{i}</li>)}</ul>
          ) : (
            <p className="muted">Nothing missing.</p>
          )}
        </div>
      </div>
      <p className="ai-line"><span>Recommended follow-up</span>{s.recommended_follow_up}</p>
    </section>
  )
}
