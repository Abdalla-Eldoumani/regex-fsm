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
      <label className="text-base font-display font-semibold text-ink">
        Regular Expression
      </label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        className={`px-5 py-4 bg-paper border-2 rounded-sm font-mono text-lg text-ink placeholder:text-ink-lighter/50 focus:outline-none focus:ring-4 transition-all ${
          error
            ? 'border-terracotta focus:ring-terracotta/20 focus:border-terracotta-dark'
            : 'border-border focus:ring-teal/10 focus:border-teal'
        }`}
        placeholder="(a|b)*abb"
      />
      {error && (
        <div className="flex items-start gap-2 p-3 bg-terracotta/10 border-l-4 border-terracotta rounded-sm">
          <span className="text-sm text-terracotta-dark font-medium">{error}</span>
        </div>
      )}
      <p className="text-sm text-ink-lighter leading-relaxed">
        <span className="font-mono text-xs bg-canvas px-2 py-0.5 rounded">|</span> union &nbsp;·&nbsp;
        <span className="font-mono text-xs bg-canvas px-2 py-0.5 rounded">*</span> star &nbsp;·&nbsp;
        <span className="font-mono text-xs bg-canvas px-2 py-0.5 rounded">+</span> plus &nbsp;·&nbsp;
        <span className="font-mono text-xs bg-canvas px-2 py-0.5 rounded">?</span> optional &nbsp;·&nbsp;
        <span className="font-mono text-xs bg-canvas px-2 py-0.5 rounded">()</span> grouping
      </p>
    </div>
  )
}
