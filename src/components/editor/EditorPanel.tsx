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

  // Transition add: need two state ids. Prepopulate from selection when possible.
  const [transFromId, setTransFromId] = useState('')
  const [transToId, setTransToId] = useState('')

  // Insert λ into the symbol input at the current cursor position.
  function insertLambda() {
    setSymbolValue(prev => prev + LAMBDA)
  }

  // Resolve the canonical symbol: the UI accepts λ (U+03BB), null means λ-move.
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
    // Verify both state ids exist in the working automaton before dispatching.
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

  return (
    // At lg+ the panel sits to the right of the graph (rendered by EditorView).
    // At narrow widths it is a collapsible bottom sheet via <details>.
    <div
      data-testid="editor-panel"
      className="bg-surface border border-border rounded-2xl overflow-hidden"
    >
      {/* Desktop heading: always visible at lg+ */}
      <div className="hidden lg:flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-raised">
        <div className="w-1.5 h-5 bg-gradient-to-b from-brand to-brand-pressed rounded-full" />
        <span className="font-display font-semibold text-text-hi text-sm">Editor Controls</span>
      </div>

      {/* Mobile: bottom-sheet wrapped in <details> */}
      <details className="lg:hidden group" open={false}>
        <summary className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-surface-raised cursor-pointer min-h-[44px] select-none list-none">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-gradient-to-b from-brand to-brand-pressed rounded-full" />
            <span className="font-display font-semibold text-text-hi text-sm">Editor Controls</span>
          </div>
          {/* Chevron rotates via group-open CSS class */}
          <svg
            className="h-4 w-4 text-text-mid transition-transform group-open:rotate-180"
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
        </summary>
      </details>

      {/* Panel body — shown always on lg+, toggled by <details> on mobile.
          Wrapping in a separate div lets Tailwind hide/show via lg:block without
          conflicting with the details open/close behaviour. */}
      <div className="hidden lg:block">
        <PanelBody
          selectedState={selectedState}
          selectedEdge={selectedEdge}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          hasSelection={hasSelection}
          isStart={isStart}
          isAccept={isAccept}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          symbolValue={symbolValue}
          setSymbolValue={setSymbolValue}
          transFromId={transFromId}
          setTransFromId={setTransFromId}
          transToId={transToId}
          setTransToId={setTransToId}
          insertLambda={insertLambda}
          handleRenameSubmit={handleRenameSubmit}
          handleAddTransition={handleAddTransition}
          handleRelabelTransition={handleRelabelTransition}
          dispatchers={dispatchers}
          working={working}
        />
      </div>

      {/* Mobile body inside <details>: toggled by summary above */}
      <details className="lg:hidden" open={false}>
        <summary className="sr-only">Editor controls</summary>
        <PanelBody
          selectedState={selectedState}
          selectedEdge={selectedEdge}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          hasSelection={hasSelection}
          isStart={isStart}
          isAccept={isAccept}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          symbolValue={symbolValue}
          setSymbolValue={setSymbolValue}
          transFromId={transFromId}
          setTransFromId={setTransFromId}
          transToId={transToId}
          setTransToId={setTransToId}
          insertLambda={insertLambda}
          handleRenameSubmit={handleRenameSubmit}
          handleAddTransition={handleAddTransition}
          handleRelabelTransition={handleRelabelTransition}
          dispatchers={dispatchers}
          working={working}
        />
      </details>
    </div>
  )
}

// The actual panel content — extracted so it can appear once for desktop and
// once (inside <details>) for mobile without duplicating markup logic.
interface PanelBodyProps {
  selectedState: { id: string; label?: string } | null
  selectedEdge: { id: string; from: string; to: string; symbol: string | null } | null
  selectedNodeId: string | null
  selectedEdgeId: string | null
  hasSelection: boolean
  isStart: boolean
  isAccept: boolean
  renameValue: string
  setRenameValue: (v: string) => void
  symbolValue: string
  setSymbolValue: (v: string) => void
  transFromId: string
  setTransFromId: (v: string) => void
  transToId: string
  setTransToId: (v: string) => void
  insertLambda: () => void
  handleRenameSubmit: (e: React.FormEvent) => void
  handleAddTransition: (e: React.FormEvent) => void
  handleRelabelTransition: (e: React.FormEvent) => void
  dispatchers: AutomatonEditorDispatchers
  working: WorkingAutomaton
}

function PanelBody({
  selectedState,
  selectedEdge,
  selectedNodeId,
  selectedEdgeId,
  hasSelection,
  isStart,
  isAccept,
  renameValue,
  setRenameValue,
  symbolValue,
  setSymbolValue,
  transFromId,
  setTransFromId,
  transToId,
  setTransToId,
  insertLambda,
  handleRenameSubmit,
  handleAddTransition,
  handleRelabelTransition,
  dispatchers,
  working,
}: PanelBodyProps): JSX.Element {
  const inputBase =
    'w-full min-h-[44px] px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text-hi font-mono placeholder:text-text-low focus:outline-none focus:border-brand-hover'

  return (
    <div className="divide-y divide-border">
      {/* Current selection status */}
      <div className="px-4 py-3">
        {hasSelection ? (
          <p className="text-xs text-text-mid font-mono">
            {selectedNodeId && (
              <>
                State: <span className="text-text-hi">{selectedNodeId}</span>
                {selectedState?.label && selectedState.label !== selectedNodeId && (
                  <> &quot;{selectedState.label}&quot;</>
                )}
              </>
            )}
            {selectedEdgeId && (
              <>
                Edge: <span className="text-text-hi">{selectedEdgeId}</span>{' '}
                {selectedEdge && (
                  <>
                    ({selectedEdge.from} &rarr; {selectedEdge.to},{' '}
                    {selectedEdge.symbol ?? 'λ'})
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

      {/* State actions: context-sensitive to selection */}
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

          {/* Rename */}
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

      {/* Transition relabel: shown when an edge is selected */}
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
                  placeholder="a, b, or λ"
                  className={inputBase + ' flex-1'}
                  aria-label="Transition symbol"
                  data-testid="symbol-input"
                  // maxLength: practical safety bound; not a security mechanism.
                  maxLength={64}
                />
                <PanelButton onClick={insertLambda} data-testid="lambda-btn">
                  <span aria-hidden="true">{'λ'}</span>
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

      {/* Add transition: available whenever two or more states exist */}
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
                  placeholder={'Symbol or ' + 'λ'}
                  className={inputBase + ' flex-1'}
                  aria-label="Transition symbol"
                  data-testid="add-symbol-input"
                  maxLength={64}
                />
                <PanelButton onClick={insertLambda}>
                  <span aria-hidden="true">{'λ'}</span>
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

      {/* Usage hint when no states exist yet */}
      {working.states.length === 0 && (
        <div className="px-4 py-4">
          <p className="text-xs text-text-low text-center">
            Tap the canvas to add your first state.
          </p>
        </div>
      )}
    </div>
  )
}
