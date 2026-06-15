interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({ label, onClick, disabled = false, variant = 'primary' }: ButtonProps) {
  const baseClasses = 'px-4 min-h-[44px] rounded-lg font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'

  const variantClasses = {
    primary: 'bg-brand hover:bg-brand-hover text-on-brand',
    secondary: 'bg-surface-raised border border-border text-text-mid hover:text-text-hi hover:border-border-strong',
    danger: 'bg-error hover:bg-error/90 text-on-brand',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {label}
    </button>
  )
}
