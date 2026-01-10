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
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        className="w-full px-5 py-4 bg-background/80 backdrop-blur-sm border-2 border-border hover:border-border-hover rounded-xl font-mono text-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all shadow-inner shadow-primary/5"
        placeholder={placeholder}
      />
    </div>
  )
}
