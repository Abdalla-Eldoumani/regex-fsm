interface TabButtonProps {
  label: string
  active: boolean
  onClick: () => void
}

export function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 font-sans font-medium transition-all border-b-3 relative ${
        active
          ? 'border-teal text-teal bg-teal/5'
          : 'border-transparent text-ink-light hover:text-ink hover:bg-canvas/50'
      }`}
    >
      {label}
    </button>
  )
}

interface TabsProps {
  tabs: { id: string; label: string }[]
  activeTab: string
  onChange: (tabId: string) => void
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-0.5 border-b-2 border-border bg-parchment px-2">
      {tabs.map(tab => (
        <TabButton
          key={tab.id}
          label={tab.label}
          active={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
        />
      ))}
    </div>
  )
}
