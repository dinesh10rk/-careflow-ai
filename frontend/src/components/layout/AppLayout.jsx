import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Icon from '../ui/Icon'
import { useHealth } from '../../hooks/useHealth'
import { subscribeSlowRequests } from '../../services/api'

function ModeBanner({ health }) {
  if (health.state === 'demo') {
    return (
      <div className="mode-banner">
        <Icon name="info" size={16} />
        <p>
          <strong>Demo data mode.</strong> Every record here is fictional and saved only in this browser. AI results are rule-based
          samples, not output from a live AI model. <Link to="/settings">Connection settings</Link>
        </p>
      </div>
    )
  }
  if (health.state === 'down') {
    return (
      <div className="mode-banner mode-banner-red">
        <Icon name="alert" size={16} />
        <p>
          <strong>The API cannot be reached.</strong> {health.error?.message} <Link to="/settings">Connection settings</Link>
        </p>
      </div>
    )
  }
  if (health.state === 'connected' || health.state === 'degraded') {
    if (health.state === 'degraded') {
      return (
        <div className="mode-banner mode-banner-red">
          <Icon name="alert" size={16} />
          <p>
            <strong>The API is running but the database is unavailable.</strong> Saving and loading enquiries will fail until it reconnects.
          </p>
        </div>
      )
    }
    if (health.aiMode === 'demo') {
      return (
        <div className="mode-banner">
          <Icon name="info" size={16} />
          <p>
            <strong>AI demo mode.</strong> The backend has no live AI key configured, so AI results are labelled samples.
          </p>
        </div>
      )
    }
  }
  return null
}

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [waking, setWaking] = useState(false)
  const { pathname } = useLocation()
  const { health } = useHealth()

  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => subscribeSlowRequests(setWaking), [])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {menuOpen && <button type="button" className="scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}

      <div className="app-main">
        <Topbar health={health} onMenu={() => setMenuOpen(true)} />
        <ModeBanner health={health} />
        {waking && (
          <div className="mode-banner mode-banner-wake" role="status">
            <span className="spinner spinner-sm" aria-hidden="true" />
            <p>
              <strong>Waking the server.</strong> Free hosting sleeps when idle, so the first request can take up to a minute.
            </p>
          </div>
        )}
        <main id="main" className="page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
