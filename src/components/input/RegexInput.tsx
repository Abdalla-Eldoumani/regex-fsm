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
    <div className="flex flex-col gap-1">
      <label className="text-sm text-text font-medium">Regular Expression</label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        className={`px-3 py-2 bg-surface0 border rounded font-mono text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-blue ${
          error ? 'border-red focus:ring-red' : 'border-overlay0'
        }`}
        placeholder="(a|b)*abb"
      />
      {error && <span className="text-sm text-red">{error}</span>}
      <p className="text-xs text-subtext0">
        Use | for union, * for star, + for plus, ? for optional, () for grouping
      </p>
    </div>
  )
}
