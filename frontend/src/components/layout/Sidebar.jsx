import { NavLink } from 'react-router-dom'
import Icon from '../ui/Icon'
import { getClinicSettings } from '../../config'

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/enquiries', label: 'Enquiries', icon: 'inbox' },
  { to: '/assistant', label: 'AI Assistant', icon: 'sparkles' },
  { to: '/reminders', label: 'Reminders', icon: 'bell' },
  { to: '/activity', label: 'Activity history', icon: 'clock' },
  { to: '/settings', label: 'Settings', icon: 'sliders' },
]

export function Logo({ light = true }) {
  return (
    <div className={`logo ${light ? 'logo-light' : ''}`}>
      <span className="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17h5l3-8 5 15 3-9 2 2h4" />
        </svg>
      </span>
      <span className="logo-text">
        CareFlow <span className="logo-ai">AI</span>
      </span>
    </div>
  )
}

export default function Sidebar({ open, onNavigate }) {
  const { clinicName } = getClinicSettings()
  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Primary">
      <div className="sidebar-top">
        <Logo />
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="nav-link" onClick={onNavigate}>
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="clinic-chip">
          <span className="clinic-avatar" aria-hidden="true">
            {clinicName.charAt(0)}
          </span>
          <span className="clinic-name">{clinicName}</span>
        </div>
        <p className="safety-note">
          <Icon name="shield" size={15} />
          <span>Fictional data only. Every AI draft needs staff review before use.</span>
        </p>
      </div>
    </aside>
  )
}
