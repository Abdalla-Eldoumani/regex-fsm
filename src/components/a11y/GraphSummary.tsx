import { useId, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Automaton } from '@/core/automata/types'
import { automatonToDescription } from '@/visualization/describe'

interface GraphSummaryProps {
  automaton: Automaton
  ariaLabel: string
  children: ReactNode
}

// GraphSummary makes a Cytoscape graph reachable for assistive technology without
// touching renderer.tsx. The Cytoscape canvas is opaque to AT, so this host wrapper
// gives the graph a role="img" + aria-label (so it announces as a labelled image)
// and an aria-describedby pointing at a sibling region holding the course-notation
// summary from automatonToDescription. Every graph host on every route reuses this
// one wrapper, so the wiring is identical and the summary always matches the diagram
// (both read the same Automaton model).
//
// The summary region uses Tailwind sr-only, NOT display:none and NOT the hidden
// attribute: sr-only keeps the node visually hidden but PRESENT in the accessibility
// tree, where display:none / hidden would drop it and a screen reader would hear an
// empty canvas. The wrapper keeps w-full h-full so the graph's layout is unchanged.
export function GraphSummary({ automaton, ariaLabel, children }: GraphSummaryProps) {
  // useId gives a process-unique id per instance, so several graphs on one route do
  // not cross-wire their descriptions (each role="img" points at its own region).
  const descriptionId = useId()
  const description = useMemo(() => automatonToDescription(automaton), [automaton])

  return (
    <div role="img" aria-label={ariaLabel} aria-describedby={descriptionId} className="w-full h-full">
      {children}
      <div id={descriptionId} className="sr-only">
        {description}
      </div>
    </div>
  )
}
