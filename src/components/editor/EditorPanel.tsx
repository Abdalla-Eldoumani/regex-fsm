import { useState } from 'react'
import type { JSX } from 'react'
import type { AutomatonEditorDispatchers } from '@/hooks/useAutomatonEditor'
import type { WorkingAutomaton } from '@/editor/editorTypes'

// Lambda glyph for display alongside the symbol input. Clicking it inserts λ
// into the input — plain string insertion, never eval or RegExp construction.
const LAMBDA = 'λ'

interface EditorPanelProps {
  working: WorkingAutomaton
  dispatchers: AutomatonEditorDispatchers
}

// A single panel button styled with state-semantic or brand tokens as
// appropriate. 44px minimum touch target enforced via min-h / min-w.
function PanelButton({
  onClick,
  disabled,
  children,
  variant = 'secondary',
  'data-testid': testId,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  'data-testid'?: string
}) {
  const base =
    'min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-brand text-on-brand hover:bg-brand-hover',
    secondary:
      'bg-surface-raised border border-border text-text-mid hover:text-text-hi hover:border-border-strong',
    danger: 'bg-error/10 border border-error/30 text-error hover:bg-error/20',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`${base} ${variants[variant]}`}
    >
      {children}
    </button>
  )
}

// A small labeled section within the panel. Keeps visual hierarchy consistent.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-text-low">{title}</div>
      {children}
    </div>
  )
}

export function EditorPanel({ working, dispatchers }: EditorPanelProps): JSX.Element {
  const { selection } = working
  const selectedNodeId = selection.nodeIds[0] ?? null
  const selectedEdgeId = selection.edgeIds[0] ?? null

  // Rename state: local controlled input; dispatched on submit.
  const [renameValue, setRenameValue] = useState('')

  // Transition symbol input: accepts any printable character including λ.
  // Symbol is plain text passed to dispatch — never used to construct RegExp or
  // evaluated as code (threat T-04-12).
  const [symbolValue, setSymbolValue] = useState('')

  // Add transition inputs: source and target state ids typed by the user.
  const [transFromId, setTransFromId] = useState('')
  const [transToId, setTransToId] = useState('')

  // Mobile bottom-sheet: expanded/collapsed state. Separate from <details> to
  // keep a single state instance shared by both desktop and mobile renders.
  const [mobileOpen, setMobileOpen] = useState(false)

  // Insert λ into the symbol input.
  function insertLambda() {
    setSymbolValue(prev => prev + LAMBDA)
  }

  // Resolve the canonical symbol: '' or 'λ' both mean a λ-move (null).
  function resolveSymbol(raw: string): string | null {
    const trimmed = raw.trim()
    if (trimmed === '' || trimmed === LAMBDA) return null
    return trimmed
  }

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedNodeId && renameValue.trim()) {
      dispatchers.renameState(selectedNodeId, renameValue.trim())
      setRenameValue('')
    }
  }

  function handleAddTransition(e: React.FormEvent) {
    e.preventDefault()
    const from = transFromId.trim()
    const to = transToId.trim()
    if (!from || !to) return
    const ids = new Set(working.states.map(s => s.id))
    if (!ids.has(from) || !ids.has(to)) return
    dispatchers.addTransition(from, to, resolveSymbol(symbolValue))
    setSymbolValue('')
  }

  function handleRelabelTransition(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEdgeId) return
    dispatchers.relabelTransition(selectedEdgeId, resolveSymbol(symbolValue))
    setSymbolValue('')
  }

  const selectedState = working.states.find(s => s.id === selectedNodeId) ?? null
  const selectedEdge = working.transitions.find(e => e.id === selectedEdgeId) ?? null
  const hasSelection = selectedNodeId !== null || selectedEdgeId !== null
  const isStart = selectedNodeId !== null && working.startState === selectedNodeId
  const isAccept =
    selectedNodeId !== null && working.acceptStates.includes(selectedNodeId)

  const inputBase =
    'w-full min-h-[44px] px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text-hi font-mono placeholder:text-text-low focus:outline-none focus:border-brand-hover'

  // Panel body — shared markup rendered once. Visibility is controlled by the
  // outer container's responsive classes, not by duplicating the body.
  const body = (
    <div className="divide-y divide-border">
      {/* Selection status */}
      <div className="px-4 py-3">
        {hasSelection ? (
          <p className="text-xs text-text-mid font-mono">
            {selectedNodeId && (
              <>
                State: <span className="text-text-hi">{selectedNodeId}</span>
                {selectedState?.label && selectedState.label !== selectedNodeId && (
                  <> &ldquo;{selectedState.label}&rdquo;</>
                )}
              </>
            )}
            {selectedEdgeId && (
              <>
                Edge: <span className="text-text-hi">{selectedEdgeId}</span>{' '}
                {selectedEdge && (
                  <>
                    ({selectedEdge.from} &rarr; {selectedEdge.to},{' '}
                    {selectedEdge.symbol ?? LAMBDA})
                  </>
                )}
              </>
            )}
          </p>
        ) : (
          <p className="text-xs text-text-low">
            Click a state or edge on the canvas to select it.
          </p>
        )}
      </div>

      {/* State actions */}
      {selectedNodeId && (
        <div className="px-4 py-4 space-y-3">
          <Section title="Selected State">
            <div className="flex flex-wrap gap-2">
              <PanelButton
                onClick={() => dispatchers.setStart(selectedNodeId)}
                disabled={isStart}
                data-testid="set-start-btn"
              >
                {isStart ? 'Is Start' : 'Set Start'}
              </PanelButton>
              <PanelButton
                onClick={() => dispatchers.toggleAccept(selectedNodeId)}
                variant={isAccept ? 'primary' : 'secondary'}
                data-testid="toggle-accept-btn"
              >
                {isAccept ? 'Remove Accept' : 'Add Accept'}
              </PanelButton>
              <PanelButton
                onClick={() => dispatchers.removeState(selectedNodeId)}
                variant="danger"
                data-testid="delete-state-btn"
              >
                Delete State
              </PanelButton>
            </div>
          </Section>

          <Section title="Rename">
            <form onSubmit={handleRenameSubmit} className="flex gap-2">
              <input
                type="text"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                placeholder={selectedState?.label ?? selectedNodeId}
                className={inputBase + ' flex-1'}
                aria-label="New state label"
                data-testid="rename-input"
              />
              <PanelButton onClick={() => undefined} disabled={!renameValue.trim()} variant="primary">
                <span aria-hidden="true">&#10003;</span>
                <span className="sr-only">Rename</span>
              </PanelButton>
            </form>
          </Section>
        </div>
      )}

      {/* Edge relabel */}
      {selectedEdgeId && (
        <div className="px-4 py-4 space-y-3">
          <Section title="Selected Edge">
            <div className="flex flex-wrap gap-2">
              <PanelButton
                onClick={() => dispatchers.removeTransition(selectedEdgeId)}
                variant="danger"
                data-testid="delete-edge-btn"
              >
                Delete Edge
              </PanelButton>
            </div>
          </Section>

          <Section title="Relabel Transition">
            <form onSubmit={handleRelabelTransition} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={symbolValue}
                  onChange={e => setSymbolValue(e.target.value)}
                  placeholder={'a, b, or ' + LAMBDA}
                  className={inputBase + ' flex-1'}
                  aria-label="Transition symbol"
                  data-testid="symbol-input"
                  maxLength={64}
                />
                <PanelButton onClick={insertLambda} data-testid="lambda-btn">
                  <span aria-hidden="true">{LAMBDA}</span>
                  <span className="sr-only">Insert lambda</span>
                </PanelButton>
              </div>
              <PanelButton onClick={() => undefined} variant="primary">
                Apply Label
              </PanelButton>
            </form>
          </Section>
        </div>
      )}

      {/* Add transition */}
      {working.states.length >= 2 && (
        <div className="px-4 py-4 space-y-3">
          <Section title="Add Transition">
            <form onSubmit={handleAddTransition} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={transFromId}
                  onChange={e => setTransFromId(e.target.value)}
                  placeholder="From (e.g. s0)"
                  className={inputBase}
                  aria-label="Source state id"
                  data-testid="trans-from-input"
                  maxLength={32}
                />
                <input
                  type="text"
                  value={transToId}
                  onChange={e => setTransToId(e.target.value)}
                  placeholder="To (e.g. s1)"
                  className={inputBase}
                  aria-label="Target state id"
                  data-testid="trans-to-input"
                  maxLength={32}
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={symbolValue}
                  onChange={e => setSymbolValue(e.target.value)}
                  placeholder={'Symbol or ' + LAMBDA}
                  className={inputBase + ' flex-1'}
                  aria-label="Transition symbol for new edge"
                  data-testid="add-symbol-input"
                  maxLength={64}
                />
                <PanelButton onClick={insertLambda}>
                  <span aria-hidden="true">{LAMBDA}</span>
                  <span className="sr-only">Insert lambda</span>
                </PanelButton>
              </div>
              <PanelButton
                onClick={() => undefined}
                variant="primary"
                disabled={!transFromId.trim() || !transToId.trim()}
                data-testid="add-transition-btn"
              >
                Add Transition
              </PanelButton>
            </form>
          </Section>
        </div>
      )}

      {/* Clear selection */}
      {hasSelection && (
        <div className="px-4 py-3">
          <PanelButton onClick={dispatchers.clearSelection}>
            Clear Selection
          </PanelButton>
        </div>
      )}

      {/* Empty-state hint */}
      {working.states.length === 0 && (
        <div className="px-4 py-4">
          <p className="text-xs text-text-low text-center">
            Tap the canvas to add your first state.
          </p>
        </div>
      )}
    </div>
  )

  return (
    <div
      data-testid="editor-panel"
      className="bg-surface border border-border rounded-2xl overflow-hidden"
    >
      {/* Panel header — the toggle button is only visible on mobile (<lg).
          On lg+ the header is decorative only; the body is always shown. */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-gradient-to-b from-brand to-brand-pressed rounded-full" />
          <span className="font-display font-semibold text-text-hi text-sm">Editor Controls</span>
        </div>
        {/* Collapse toggle — only rendered and interactable on mobile */}
        <button
          className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-text-mid hover:text-text-hi transition-colors"
          onClick={() => setMobileOpen(o => !o)}
          aria-expanded={mobileOpen}
          aria-controls="editor-panel-body"
        >
          <svg
            className={`h-4 w-4 transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
          <span className="sr-only">{mobileOpen ? 'Collapse' : 'Expand'} editor controls</span>
        </button>
      </div>

      {/* Panel body:
          - lg+: always visible (lg:block; the mobile toggle is hidden)
          - mobile: shown/hidden via aria-expanded state (block when open, hidden when closed)
          Single state instance — no content duplication. */}
      <div
        id="editor-panel-body"
        className={`${mobileOpen ? 'block' : 'hidden'} lg:block`}
      >
        {body}
      </div>
    </div>
  )
}
