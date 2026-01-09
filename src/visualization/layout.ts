import { LayoutOptions } from 'cytoscape'
import { Automaton } from '@/core/automata/types'

export const dagreLayout: LayoutOptions = {
  name: 'breadthfirst',
  directed: true,
  spacingFactor: 1.5,
  padding: 30,
  avoidOverlap: true,
}

export const coseLayout: LayoutOptions = {
  name: 'cose',
  idealEdgeLength: 100,
  nodeOverlap: 20,
  refresh: 20,
  fit: true,
  padding: 30,
  randomize: false,
  componentSpacing: 100,
  nodeRepulsion: 400000,
  edgeElasticity: 100,
  nestingFactor: 5,
  gravity: 80,
  numIter: 1000,
  initialTemp: 200,
  coolingFactor: 0.95,
  minTemp: 1.0,
}

export function selectLayout(automaton: Automaton): LayoutOptions {
  const epsilonCount = automaton.transitions.filter(t => t.symbol === null).length
  const ratio = automaton.transitions.length > 0
    ? epsilonCount / automaton.transitions.length
    : 0

  if (ratio > 0.3) return coseLayout
  return dagreLayout
}
