import { useState, useEffect } from 'react'
import { patternTemplates, getTemplateById, PatternTemplate, isComplexPattern } from '@/core/patterns/templates'
import { DFA } from '@/core/automata/types'

interface PatternBuilderProps {
  onInsert: (regex: string) => void
  onBuildDFA?: (dfa: DFA, alphabet: string) => void
}

export function PatternBuilder({ onInsert, onBuildDFA }: PatternBuilderProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [parameters, setParameters] = useState<Record<string, string>>({})
  const [generatedRegex, setGeneratedRegex] = useState<string>('')
  const [isExpanded, setIsExpanded] = useState(false)

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
    <div className="border border-border rounded-xl overflow-hidden bg-background/80 backdrop-blur-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-3 flex items-center justify-between bg-gradient-to-r from-accent/10 to-transparent hover:from-accent/20 transition-all"
      >
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5 text-accent"
          >
            <path
              fillRule="evenodd"
              d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-semibold text-text-primary">Pattern Builder</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
            Helper
          </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-5 h-5 text-text-secondary transition-transform ${
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
        <div className="p-5 space-y-4 border-t border-border animate-slide-up">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Select Pattern Type
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-4 py-3 bg-background border-2 border-border hover:border-border-hover focus:border-accent focus:ring-4 focus:ring-accent/20 rounded-xl text-sm text-text-primary focus:outline-none transition-all cursor-pointer"
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
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    {param.description}
                  </label>
                  <input
                    type="text"
                    value={parameters[param.name] || ''}
                    onChange={(e) => handleParameterChange(param.name, e.target.value)}
                    placeholder={param.placeholder}
                    className="w-full px-4 py-2 bg-background border-2 border-border hover:border-border-hover focus:border-accent focus:ring-4 focus:ring-accent/20 rounded-lg text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none transition-all"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Generated Regex Output - only show if we have a non-empty regex */}
          {generatedRegex && (
            <div className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/30 rounded-xl space-y-3">
              <div>
                <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Generated Regex
                </div>
                <div className="px-4 py-3 bg-background/80 rounded-lg border border-success/20 font-mono text-lg text-success break-all">
                  {generatedRegex}
                </div>
              </div>
              <button
                onClick={handleInsert}
                className="w-full cursor-pointer px-4 py-3 bg-gradient-to-br from-success to-success/80 hover:from-success/90 hover:to-success/70 text-white font-semibold rounded-lg transition-all shadow-sm hover:shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
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
            <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold">
                  DFA Construction Required
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                This pattern (3+ character substring avoidance) cannot be easily expressed as a regular expression.
                The DFA is constructed directly using the <strong>KMP (Knuth-Morris-Pratt) failure function algorithm</strong>,
                which is the standard approach taught in formal language theory courses.
              </p>
              <button
                onClick={handleBuildDFA}
                className="w-full cursor-pointer px-4 py-3 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold rounded-lg transition-all shadow-sm hover:shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
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
            <div className="p-4 bg-gradient-to-br from-secondary/10 to-secondary/5 border-2 border-secondary/30 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold">
                  {isComplex ? 'Recommended: Build DFA Directly' : 'Alternative: Build DFA Directly'}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                {isComplex
                  ? 'This pattern is complex and may produce an overly restrictive regex. For accurate results matching formal language theory, we recommend building the DFA directly using the KMP failure function algorithm.'
                  : 'For this pattern, you can also build a DFA directly for potentially cleaner results. The DFA is constructed using the KMP failure function algorithm.'}
              </p>
              <button
                onClick={handleBuildDFA}
                className="w-full cursor-pointer px-4 py-3 bg-gradient-to-br from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 text-white font-semibold rounded-lg transition-all shadow-sm hover:shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06l-1.72-1.72 1.72-1.72zm3.44-1.06a.75.75 0 10-1.06 1.06l1.72 1.72-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z" clipRule="evenodd" />
                </svg>
                Build DFA Directly
              </button>
            </div>
          )}

          {!selectedTemplateId && (
            <div className="p-4 bg-secondary/5 border border-secondary/20 rounded-xl text-sm text-text-secondary">
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
