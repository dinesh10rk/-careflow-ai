import { useLocation } from 'react-router-dom'
import Icon from '../ui/Icon'
import { Logo, NAV_ITEMS } from './Sidebar'

const PILL = {
  demo: { tone: 'amber', text: 'Demo data in this browser' },
  checking: { tone: 'grey', text: 'Checking API' },
  connected: { tone: 'green', text: 'API connected' },
  degraded: { tone: 'amber', text: 'API: database unavailable' },
  down: { tone: 'red', text: 'API unreachable' },
}

export function aiPill(health) {
  if (health.state === 'demo') return { tone: 'amber', text: 'AI: demo mode' }
  if (health.state === 'down' || health.state === 'checking') return { tone: 'grey', text: 'AI: unknown' }
  if (health.aiMode === 'live') return { tone: 'green', text: 'AI: live' }
  if (health.aiMode === 'demo') return { tone: 'amber', text: 'AI: demo mode' }
  return { tone: 'red', text: 'AI: misconfigured' }
}

export default function Topbar({ health, onMenu }) {
  const { pathname } = useLocation()
  const current = NAV_ITEMS.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
  const data = PILL[health.state]
  const ai = aiPill(health)

  return (
    <header className="topbar">
      <button type="button" className="icon-btn menu-btn" onClick={onMenu} aria-label="Open navigation">
        <Icon name="menu" size={20} />
      </button>
      <div className="topbar-logo">
        <Logo light={false} />
      </div>
      <span className="topbar-title">{current?.label || 'Not found'}</span>

      <div className="topbar-pills">
        <span className={`pill pill-${data.tone}`}>
          <span className="pill-dot" aria-hidden="true" />
          {data.text}
        </span>
        <span className={`pill pill-${ai.tone}`}>
          <Icon name="sparkles" size={12} />
          {ai.text}
        </span>
      </div>
    </header>
  )
}
