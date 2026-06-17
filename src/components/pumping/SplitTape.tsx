import type { JSX } from 'react'

// SplitTape: renders the witness w = xyz as three visually-distinct segments on
// a cell tape. This is a SIBLING of InputTape (src/components/simulation/InputTape.tsx),
// not a modification of it. InputTape is memoized and tied to the simulation engine;
// reusing it would leak the pumping game's x/y/z concept into a component that does
// not know about splits. A sibling keeps the concerns isolated.
//
// The y-segment carries the `.active` treatment (border-state-active + bg-state-active-soft)
// because y is the pumped block -- the block the adversary chose as the repeated cycle
// (§4.3.2). The non-color cue is the segment label below each run (x, y, z), matching
// InputTape's "Head" caption pattern. Colorblind-safe: each segment also has a distinct
// border style (subtle for x, state-active for y, raised for z).
//
// Empty x or z segments render nothing (the plan says "empty segments render nothing"
// so a w entirely in the y-block or with a short prefix is handled cleanly).

interface SplitTapeProps {
  x: string
  y: string
  z: string
}

function SegmentCell({ char }: { char: string }): JSX.Element {
  return (
    <div className="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg font-mono text-lg font-bold border bg-surface border-border text-text-hi shadow-sm">
      {char}
    </div>
  )
}

function ActiveCell({ char }: { char: string }): JSX.Element {
  return (
    <div
      // y is the pumped block: the adversary's repeated cycle from §4.3.2.
      // The .active treatment (is-active + border-state-active + bg-state-active-soft)
      // is the project-wide amber "this is the thing happening now" cue (per the project conventions).
      className="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg font-mono text-lg font-bold is-active border-state-active bg-state-active-soft text-text-hi"
    >
      {char}
    </div>
  )
}

function Segment({
  chars,
  label,
  variant,
}: {
  chars: string[]
  label: string
  variant: 'x' | 'y' | 'z'
}): JSX.Element | null {
  if (chars.length === 0) return null

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-1">
        {chars.map((ch, idx) =>
          variant === 'y' ? (
            <ActiveCell key={idx} char={ch} />
          ) : (
            <SegmentCell key={idx} char={ch} />
          )
        )}
      </div>
      {/* Non-color segment label, same pattern as InputTape's "Head" caption. */}
      <span
        className={
          'text-[10px] font-mono font-bold uppercase tracking-widest mt-0.5 ' +
          (variant === 'y' ? 'text-state-active' : 'text-text-low')
        }
      >
        {label}
      </span>
    </div>
  )
}

export function SplitTape({ x, y, z }: SplitTapeProps): JSX.Element {
  const xChars = x.split('')
  const yChars = y.split('')
  const zChars = z.split('')

  const hasAny = xChars.length > 0 || yChars.length > 0 || zChars.length > 0

  return (
    <div
      data-testid="pumping-splittape"
      className="overflow-x-auto pb-2 pt-2 px-2"
    >
      {!hasAny ? (
        <div className="text-sm text-text-low italic">No word to display.</div>
      ) : (
        <div className="flex items-start gap-3 w-max mx-auto">
          <Segment chars={xChars} label="x" variant="x" />
          <span
            data-testid="pumping-segment-y"
            className="contents"
          >
            <Segment chars={yChars} label="y" variant="y" />
          </span>
          <Segment chars={zChars} label="z" variant="z" />
        </div>
      )}
    </div>
  )
}
