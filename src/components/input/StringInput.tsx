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
    <div className="flex flex-col gap-3">
      <label className="text-base font-display font-semibold text-ink">Test String</label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        className="px-5 py-4 bg-paper border-2 border-border rounded-sm font-mono text-lg text-ink placeholder:text-ink-lighter/50 focus:outline-none focus:ring-4 focus:ring-teal/10 focus:border-teal transition-all"
        placeholder={placeholder}
      />
      <p className="text-sm text-ink-lighter leading-relaxed">
        Input string to simulate against the automaton
      </p>
    </div>
  )
}
