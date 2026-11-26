import { useEffect, useRef } from 'react'
import Icon from './Icon'
import Button from './Button'

function useOverlay(open, onClose) {
  const panelRef = useRef(null)
  const lastFocus = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    lastFocus.current = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = setTimeout(() => panelRef.current?.focus(), 30)

    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        const focusable = [...nodes].filter((n) => !n.disabled && n.offsetParent !== null)
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      lastFocus.current?.focus?.()
    }
  }, [open, onClose])

  return panelRef
}

/** Right-hand detail panel. */
export function Drawer({ open, onClose, title, subtitle, children }) {
  const ref = useOverlay(open, onClose)
  if (!open) return null
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <header className="drawer-head">
          <div>
            <h2 className="drawer-title">{title}</h2>
            {subtitle && <p className="drawer-sub">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close panel">
            <Icon name="x" />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  )
}

/** Small confirmation dialog for destructive actions. */
export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger, loading, onConfirm, onCancel }) {
  const ref = useOverlay(open, onCancel)
  if (!open) return null
  return (
    <div className="overlay overlay-center" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <h2 className="dialog-title">{title}</h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
