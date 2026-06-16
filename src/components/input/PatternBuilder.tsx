import { useState, useEffect } from 'react'
import { patternTemplates, getTemplateById, PatternTemplate, isComplexPattern } from '@/core/patterns/templates'
import { DFA } from '@/core/automata/types'
import { useNotation } from '@/notation/useNotation'
import { parse } from '@/core/regex/parser'
import { formatRegex } from '@/notation/format'

interface PatternBuilderProps {
  onInsert: (regex: string) => void
  onBuildDFA?: (dfa: DFA, alphabet: string) => void
}

export function PatternBuilder({ onInsert, onBuildDFA }: PatternBuilderProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [parameters, setParameters] = useState<Record<string, string>>({})
  const [generatedRegex, setGeneratedRegex] = useState<string>('')
  const [isExpanded, setIsExpanded] = useState(false)

  const { mode } = useNotation()

  // Preview re-formats the generated regex through the AST so it flips with mode.
  // Falls back to the raw string if parsing fails (e.g., template produces partial output).
  let previewRegex = generatedRegex
  if (generatedRegex) {
    try {
      previewRegex = formatRegex(parse(generatedRegex), mode)
    } catch {
      previewRegex = generatedRegex
    }
  }

  const selectedTemplate = selectedTemplateId ? getTemplateById(selectedTemplateId) : null
  const suggestsDFA = selectedTemplate?.suggestDFA ?? false
  const hasDFABuilder = !!selectedTemplate?.buildDFA

  // Check if the current pattern is complex (benefits from DFA)
  const patternParam = parameters['pattern'] || ''
  const alphabetParam = parameters['alphabet'] || ''
  const isComplex = patternParam && alphabetParam && isComplexPattern(patternParam, alphabetParam)

  useEffect(() => {
    if (selectedTemplate) {
      const paramValues = selectedTemplate.parameters.map((p) => parameters[p.name] || '')
      if (paramValues.every((v) => v.trim() !== '')) {
        try {
          const regex = selectedTemplate.buildRegex(...paramValues)
          // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing setState-in-effect; refactor under test in its owning phase (see .agent/TECH_DEBT.md)
          setGeneratedRegex(regex)
        } catch {
          setGeneratedRegex('')
        }
      } else {
        setGeneratedRegex('')
      }
    } else {
      setGeneratedRegex('')
    }
  }, [selectedTemplate, parameters])

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId)
    setParameters({})
    setGeneratedRegex('')
  }

  const handleParameterChange = (paramName: string, value: string) => {
    setParameters((prev) => ({
      ...prev,
      [paramName]: value,
    }))
  }

  const handleInsert = () => {
    if (generatedRegex) {
      onInsert(generatedRegex)
      setSelectedTemplateId('')
      setParameters({})
      setGeneratedRegex('')
    }
  }

  const handleBuildDFA = () => {
    if (selectedTemplate?.buildDFA && onBuildDFA) {
      if (patternParam && alphabetParam) {
        const alphabetSet = new Set(alphabetParam.split(''))
        const dfa = selectedTemplate.buildDFA(patternParam, alphabetSet)
        onBuildDFA(dfa, alphabetParam)
        setSelectedTemplateId('')
        setParameters({})
        setGeneratedRegex('')
      }
    }
  }

  const canBuildDFA = hasDFABuilder && patternParam && alphabetParam

  const categorizedTemplates = patternTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = []
    }
    acc[template.category].push(template)
    return acc
  }, {} as Record<string, PatternTemplate[]>)

  const categoryLabels: Record<string, string> = {
    basic: 'Basic',
    position: 'Position',
    repetition: 'Repetition',
    character: 'Character',
    combination: 'Combination',
    length: 'Length',
    counting: 'Counting',
    negation: 'Negation',
    ordering: 'Ordering',
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 min-h-[44px] flex items-center justify-between bg-surface hover:bg-surface-raised transition-all"
      >
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5 text-brand-hover"
          >
            <path
              fillRule="evenodd"
              d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-semibold text-text-hi">Pattern Builder</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-brand-tint text-brand-hover font-medium">
            Helper
          </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-5 h-5 text-text-mid transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-5 space-y-4 border-t border-border">
          <div>
            <label className="block text-xs font-semibold text-text-mid uppercase tracking-label mb-2">
              Select Pattern Type
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-4 min-h-[44px] bg-surface border border-border hover:border-border-strong rounded-lg text-sm text-text-hi focus-visible:outline-none transition-all cursor-pointer"
            >
              <option value="">Choose a pattern...</option>
              {Object.entries(categorizedTemplates).map(([category, templates]) => (
                <optgroup key={category} label={categoryLabels[category]}>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.description}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {selectedTemplate && (
            <div className="space-y-3">
              {selectedTemplate.parameters.map((param) => (
                <div key={param.name}>
                  <label className="block text-xs font-semibold text-text-mid mb-1.5">
                    {param.description}
                  </label>
                  <input
                    type="text"
                    value={parameters[param.name] || ''}
                    onChange={(e) => handleParameterChange(param.name, e.target.value)}
                    placeholder={param.placeholder}
                    className="w-full px-4 min-h-[44px] bg-surface border border-border hover:border-border-strong rounded-lg text-sm font-mono text-text-hi placeholder:text-text-low focus-visible:outline-none transition-all"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Generated Regex Output - only show if we have a non-empty regex */}
          {generatedRegex && (
            <div className="p-4 bg-surface-raised border border-border rounded-lg space-y-3">
              <div>
                <div className="text-xs font-semibold text-text-mid uppercase tracking-label mb-2">
                  Generated Regex
                </div>
                <div className="px-4 py-3 bg-surface-overlay rounded-lg border border-border font-mono text-lg text-text-hi break-all">
                  {previewRegex}
                </div>
              </div>
              <button
                onClick={handleInsert}
                className="w-full cursor-pointer px-4 min-h-[44px] bg-brand hover:bg-brand-hover text-on-brand font-semibold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
                  <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                </svg>
                Use This Regex
              </button>
            </div>
          )}

          {/* DFA Required - when regex cannot be generated (empty) but DFA can be built */}
          {!generatedRegex && canBuildDFA && selectedTemplate && (
            <div className="p-4 bg-surface-raised border border-border rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-brand-hover">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold">
                  DFA Construction Required
                </span>
              </div>
              <p className="text-xs text-text-low">
                This pattern (3+ character substring avoidance) cannot be easily expressed as a regular expression.
                The DFA is constructed directly using the <strong className="text-text-mid">KMP (Knuth-Morris-Pratt) failure function algorithm</strong>,
                which is the standard approach taught in formal language theory courses.
              </p>
              <button
                onClick={handleBuildDFA}
                className="w-full cursor-pointer px-4 min-h-[44px] bg-brand hover:bg-brand-hover text-on-brand font-semibold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06l-1.72-1.72 1.72-1.72zm3.44-1.06a.75.75 0 10-1.06 1.06l1.72 1.72-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z" clipRule="evenodd" />
                </svg>
                Build DFA Directly
              </button>
            </div>
          )}

          {/* DFA Suggestion for patterns where regex works but DFA might be cleaner */}
          {generatedRegex && suggestsDFA && canBuildDFA && (
            <div className="p-4 bg-surface-raised border border-border rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-brand-hover">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold">
                  {isComplex ? 'Recommended: Build DFA Directly' : 'Alternative: Build DFA Directly'}
                </span>
              </div>
              <p className="text-xs text-text-low">
                {isComplex
                  ? 'This pattern is complex and may produce an overly restrictive regex. For accurate results matching formal language theory, we recommend building the DFA directly using the KMP failure function algorithm.'
                  : 'For this pattern, you can also build a DFA directly for potentially cleaner results. The DFA is constructed using the KMP failure function algorithm.'}
              </p>
              <button
                onClick={handleBuildDFA}
                className="w-full cursor-pointer px-4 min-h-[44px] bg-brand hover:bg-brand-hover text-on-brand font-semibold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06l-1.72-1.72 1.72-1.72zm3.44-1.06a.75.75 0 10-1.06 1.06l1.72 1.72-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z" clipRule="evenodd" />
                </svg>
                Build DFA Directly
              </button>
            </div>
          )}

          {!selectedTemplateId && (
            <div className="p-4 bg-surface-raised border border-border rounded-lg text-sm text-text-mid">
              <p className="font-semibold mb-2">How to use:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Select a pattern type from the dropdown</li>
                <li>Fill in the required parameters</li>
                <li>Preview the generated regex</li>
                <li>Click "Insert" to use it in the main input</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
