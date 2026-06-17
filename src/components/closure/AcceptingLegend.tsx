import type { JSX } from 'react'

// AcceptingLegend: persistent indicator of the accepting condition for the
// current construction mode.
//
// Union and intersection produce identical-looking product graphs; the ONLY
// structural difference is the accept set. Without a visible legend the views
// are indistinguishable (Pitfall 5 from the UI-SPEC). This component surfaces
// that difference as a persistent textual indicator in course notation so the
// viewer always knows which rule applies to each product state.
//
// For complement, the legend explains the two-stage construction (complete, then
// flip) so the viewer understands why the trap becomes accepting.
export type ClosureMode = 'union' | 'intersection' | 'complement'

export function AcceptingLegend({ mode }: { mode: ClosureMode }): JSX.Element {
  return (
    <div
      data-testid="closure-accepting-condition"
      className="rounded-xl border border-border bg-surface p-3 flex flex-col gap-1"
      role="note"
      aria-label="Accepting condition"
    >
      <span className="text-xs font-sans text-text-low uppercase tracking-wide">
        Accepting condition
      </span>
      {mode === 'union' && (
        <span className="text-sm font-mono text-text-hi">
          A product state (q&#x2090;, q&#x2099;) accepts if EITHER q&#x2090; &#x2208; A&#x2090; OR q&#x2099; &#x2208; A&#x2099;
        </span>
      )}
      {mode === 'intersection' && (
        <span className="text-sm font-mono text-text-hi">
          A product state (q&#x2090;, q&#x2099;) accepts only if BOTH q&#x2090; &#x2208; A&#x2090; AND q&#x2099; &#x2208; A&#x2099;
        </span>
      )}
      {mode === 'complement' && (
        <span className="text-sm font-mono text-text-hi">
          Complete over &#x3A3; first (add trap &#x2205; for missing transitions), then flip: every non-accepting state (including &#x2205;) becomes accepting
        </span>
      )}
    </div>
  )
}
