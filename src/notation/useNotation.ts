import { useContext } from 'react'
import { NotationContext, NotationContextValue } from './NotationContext'
import { GLYPHS, NotationMode } from './glyphs'
import { RegexNode } from '@/core/regex/ast'
import { formatRegex } from './format'

export interface UseNotationReturn {
  mode: NotationMode
  setMode: (m: NotationMode) => void
  glyphs: typeof GLYPHS[NotationMode]
  /** Format an AST node as a string in the current notation mode. */
  format: (ast: RegexNode) => string
}

/**
 * Returns the active notation mode, a setter, the glyph table for that mode,
 * and a convenience formatter. Must be called inside a NotationProvider.
 */
export function useNotation(): UseNotationReturn {
  const ctx = useContext(NotationContext)

  if (ctx === undefined) {
    throw new Error(
      'useNotation must be used inside a NotationProvider. ' +
      'Wrap the component tree with <NotationProvider>.'
    )
  }

  const { mode, setMode }: NotationContextValue = ctx

  return {
    mode,
    setMode,
    glyphs: GLYPHS[mode],
    format: (ast: RegexNode) => formatRegex(ast, mode),
  }
}
