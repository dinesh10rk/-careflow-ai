import Icon from '../ui/Icon'
import { ACTION_LABELS } from '../../utils/constants'
import { relativeTime, formatDateTime } from '../../utils/format'

export const ACTION_ICONS = {
  enquiry_created: 'inbox',
  enquiry_deleted: 'trash',
  ai_classified: 'sparkles',
  ai_summarised: 'file',
  response_generated: 'mail',
  response_approved: 'check',
  response_rejected: 'x',
  status_changed: 'refresh',
  reminder_generated: 'bell',
}

export default function ActivityItem({ item, detailed = false }) {
  return (
    <li className={`activity-item tone-${item.action_type}`}>
      <span className="activity-icon" aria-hidden="true">
        <Icon name={ACTION_ICONS[item.action_type] || 'pulse'} size={16} />
      </span>
      <div className="activity-main">
        <p className="activity-text">{item.description}</p>
        <p className="activity-meta">
          {detailed ? formatDateTime(item.timestamp) : relativeTime(item.timestamp)}
          {item.ai_mode === 'demo' && <span className="mini-tag mini-tag-demo">Demo output</span>}
          {item.ai_mode === 'live' && <span className="mini-tag mini-tag-live">Live AI</span>}
        </p>
      </div>
      {detailed && <span className="activity-kind">{ACTION_LABELS[item.action_type] || item.action_type}</span>}
    </li>
  )
}
