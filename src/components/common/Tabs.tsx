interface TabButtonProps {
  label: string
  active: boolean
  onClick: () => void
}

export function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 min-h-[44px] text-sm font-medium rounded-md transition-all ${
        active
          ? 'bg-brand-tint text-brand-hover border border-brand-hover/30'
          : 'text-text-mid hover:text-text-hi hover:bg-surface-raised'
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
    <div className="flex gap-1 p-1 bg-surface-raised rounded-lg">
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
