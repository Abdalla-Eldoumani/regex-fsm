import { ChangeEvent } from 'react'

interface RegexInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

export function RegexInput({ value, onChange, error }: RegexInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          className={`w-full px-5 py-4 bg-background/80 backdrop-blur-sm border-2 rounded-xl font-mono text-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-4 transition-all shadow-inner ${
            error
              ? 'border-error focus:ring-error/20 focus:border-error shadow-error/10'
              : 'border-border hover:border-border-hover focus:ring-primary/20 focus:border-primary shadow-primary/5'
          }`}
          placeholder="(a|b)*abb"
        />
        {error && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-error">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-error font-semibold bg-error-light px-3 py-2 rounded-lg border border-error/30 animate-slide-up">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-text-secondary text-xs font-medium">
          <span className="font-mono text-primary font-bold">|</span> union
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-text-secondary text-xs font-medium">
          <span className="font-mono text-secondary font-bold">*</span> star
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-text-secondary text-xs font-medium">
          <span className="font-mono text-accent font-bold">+</span> plus
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 text-text-secondary text-xs font-medium">
          <span className="font-mono text-success font-bold">?</span> optional
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-secondary/10 border border-accent-secondary/20 text-text-secondary text-xs font-medium">
          <span className="font-mono text-accent-secondary font-bold">()</span> grouping
        </span>
      </div>
    </div>
  )
}
