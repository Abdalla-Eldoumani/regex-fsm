interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({ label, onClick, disabled = false, variant = 'primary' }: ButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantClasses = {
    primary: 'bg-primary hover:bg-primary-hover text-white focus:ring-primary shadow-primary/25',
    secondary: 'bg-white border border-border text-text-secondary hover:text-text-primary hover:bg-secondary-light focus:ring-border',
    danger: 'bg-error hover:bg-error/90 text-white focus:ring-error shadow-error/25',
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
