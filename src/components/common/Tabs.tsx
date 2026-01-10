interface TabButtonProps {
  label: string
  active: boolean
  onClick: () => void
}

export function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
        active
          ? 'bg-primary text-white shadow-sm'
          : 'text-text-secondary hover:text-text-primary hover:bg-secondary-light'
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
    <div className="flex gap-1 p-1 bg-secondary-light/30 rounded-lg">
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
