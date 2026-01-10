interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({ label, onClick, disabled = false, variant = 'primary' }: ButtonProps) {
  const baseClasses = 'px-6 py-3 rounded-sm font-sans font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  const variantClasses = {
    primary: 'bg-teal hover:bg-teal-dark text-paper shadow-sm hover:shadow-md active:shadow-none',
    secondary: 'bg-canvas hover:bg-border text-ink border-2 border-border hover:border-border-dark',
    danger: 'bg-terracotta hover:bg-terracotta-dark text-paper shadow-sm hover:shadow-md active:shadow-none',
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
