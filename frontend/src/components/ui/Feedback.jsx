import Icon from './Icon'
import Button from './Button'

export function Spinner({ label = 'Loading' }) {
  return <span className="spinner" role="status" aria-label={label} />
}

export function Skeleton({ width = '100%', height = 14, radius = 6, className = '' }) {
  return <span className={`skeleton ${className}`.trim()} style={{ width, height, borderRadius: radius }} aria-hidden="true" />
}

export function EmptyState({ icon = 'inbox', title, children, action }) {
  return (
    <div className="state">
      <span className="state-icon">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="state-title">{title}</h3>
      {children && <p className="state-text">{children}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="state state-error" role="alert">
      <span className="state-icon">
        <Icon name="alert" size={22} />
      </span>
      <h3 className="state-title">{title}</h3>
      <p className="state-text">{error?.message || 'Please try again.'}</p>
      {onRetry && (
        <Button icon="refresh" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/** tone: info | warning | danger | success */
export function InlineAlert({ tone = 'info', icon, title, children, className = '' }) {
  const defaultIcon = { info: 'info', warning: 'alert', danger: 'alert', success: 'check' }[tone]
  return (
    <div className={`alert alert-${tone} ${className}`.trim()} role={tone === 'danger' ? 'alert' : 'note'}>
      <Icon name={icon || defaultIcon} size={18} className="alert-icon" />
      <div>
        {title && <strong className="alert-title">{title}</strong>}
        {children && <div className="alert-body">{children}</div>}
      </div>
    </div>
  )
}
