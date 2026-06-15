interface BuildButtonsProps {
  autoBuild: boolean
  onAutoBuildChange: (value: boolean) => void
  onBuildNFA: () => void
  onBuildDFA: () => void
  onBuildBoth: () => void
  disabled: boolean
}

export function BuildButtons({
  autoBuild,
  onAutoBuildChange,
  onBuildNFA,
  onBuildDFA,
  onBuildBoth,
  disabled,
}: BuildButtonsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none min-h-[44px]">
          <input
            type="checkbox"
            checked={autoBuild}
            onChange={(e) => onAutoBuildChange(e.target.checked)}
            className="w-4 h-4 rounded border-border text-brand cursor-pointer"
          />
          <span className="text-sm text-text-mid">Auto-build on change</span>
        </label>
      </div>

      {!autoBuild && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onBuildNFA}
            disabled={disabled}
            className="cursor-pointer px-4 min-h-[44px] text-sm font-semibold text-on-brand bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06l-1.72-1.72 1.72-1.72zm3.44-1.06a.75.75 0 10-1.06 1.06l1.72 1.72-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z" clipRule="evenodd" />
            </svg>
            Build NFA
          </button>
          <button
            onClick={onBuildDFA}
            disabled={disabled}
            className="cursor-pointer px-4 min-h-[44px] text-sm font-semibold text-on-brand bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06l-1.72-1.72 1.72-1.72zm3.44-1.06a.75.75 0 10-1.06 1.06l1.72 1.72-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z" clipRule="evenodd" />
            </svg>
            Build DFA
          </button>
          <button
            onClick={onBuildBoth}
            disabled={disabled}
            className="cursor-pointer px-4 min-h-[44px] text-sm font-semibold text-on-brand bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.43l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" />
            </svg>
            Build Both
          </button>
        </div>
      )}
    </div>
  )
}
