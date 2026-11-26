import Icon from './Icon'

/**
 * variant: primary | secondary | ghost | danger
 * loading shows a spinner and disables the button, so a double click cannot fire twice.
 */
export default function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  children,
  className = '',
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spinner spinner-sm" aria-hidden="true" /> : icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} /> : null}
      {children}
    </button>
  )
}
