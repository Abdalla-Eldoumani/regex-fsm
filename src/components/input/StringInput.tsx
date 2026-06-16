import { ChangeEvent, memo } from 'react'

interface StringInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export const StringInput = memo(function StringInput({ value, onChange, placeholder = 'abb' }: StringInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        className="w-full px-5 min-h-[44px] py-3 bg-surface border border-border rounded-lg font-mono text-lg text-text-hi placeholder:text-text-low focus-visible:outline-none transition-all"
        placeholder={placeholder}
      />
      {value === '' && (
        <div className="text-xs text-text-low flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Testing with empty string (λ)
        </div>
      )}
    </div>
  )
})
