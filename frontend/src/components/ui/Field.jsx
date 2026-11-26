import { useId } from 'react'

/**
 * Accessible form field. Pass the control as children; it receives id, aria-invalid and aria-describedby.
 */
export default function Field({ label, hint, error, counter, children, className = '' }) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  const control = children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`.trim()}>
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        {counter && <span className="field-counter">{counter}</span>}
      </div>
      {control}
      {hint && !error && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}
