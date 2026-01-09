import { ChangeEvent } from 'react'

interface StringInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function StringInput({ value, onChange, placeholder = 'abb' }: StringInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-text font-medium">Test String</label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        className="px-3 py-2 bg-surface0 border border-overlay0 rounded font-mono text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-blue"
        placeholder={placeholder}
      />
      <p className="text-xs text-subtext0">Enter a string to test against the automaton</p>
    </div>
  )
}
