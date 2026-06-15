import { ChangeEvent, memo } from 'react'

interface RegexInputProps {
  value: string
  onChange: (value: string) => void
  alphabet: string
  onAlphabetChange: (value: string) => void
  error?: string
}

export const RegexInput = memo(function RegexInput({ value, onChange, alphabet, onAlphabetChange, error }: RegexInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const handleAlphabetChange = (e: ChangeEvent<HTMLInputElement>) => {
    onAlphabetChange(e.target.value)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <label className="block text-xs font-semibold text-text-mid uppercase tracking-label mb-2">
          Alphabet (optional)
        </label>
        <input
          type="text"
          value={alphabet}
          onChange={handleAlphabetChange}
          className="w-full px-5 min-h-[44px] bg-surface border border-border rounded-lg font-mono text-sm text-text-hi placeholder:text-text-low focus:outline-none transition-all"
          placeholder="abc (leave empty for auto-detection)"
        />
        <p className="text-xs text-text-low mt-1.5 ml-1">
          Enter symbols without separators (e.g., "abc" or "01"). Leave empty to auto-detect from regex.
        </p>
      </div>

      <div className="relative">
        <label className="block text-xs font-semibold text-text-mid uppercase tracking-label mb-2">
          Regular Expression
        </label>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          className={`w-full px-5 min-h-[44px] py-3 bg-surface border rounded-lg font-mono text-lg text-text-hi placeholder:text-text-low focus:outline-none transition-all ${
            error
              ? 'border-error'
              : 'border-border'
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
        <div className="text-sm text-error font-semibold bg-error/10 px-3 py-2 rounded-lg border border-error/30 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-tint border border-border text-text-mid text-xs font-medium">
          <span className="font-mono text-brand-hover font-bold">|</span> union
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-tint border border-border text-text-mid text-xs font-medium">
          <span className="font-mono text-brand-hover font-bold">*</span> star
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-tint border border-border text-text-mid text-xs font-medium">
          <span className="font-mono text-brand-hover font-bold">+</span> plus
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-tint border border-border text-text-mid text-xs font-medium">
          <span className="font-mono text-brand-hover font-bold">?</span> optional
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-tint border border-border text-text-mid text-xs font-medium">
          <span className="font-mono text-brand-hover font-bold">()</span> grouping
        </span>
      </div>
    </div>
  )
})
