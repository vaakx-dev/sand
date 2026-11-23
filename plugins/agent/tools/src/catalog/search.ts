import type { Tool, ToolGroup } from '../contract'

interface Candidate {
  tool: Tool
  group: ToolGroup
}

const limit = 5

const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 1)

const score = ({ tool, group }: Candidate, terms: string[]) => {
  const name = tool.name.toLowerCase()
  const about = `${group.name} ${group.label} ${group.summary}`.toLowerCase()
  const description = tool.description.toLowerCase()
  return terms.reduce((sum, term) => sum + (name.includes(term) ? 3 : 0) + (about.includes(term) ? 2 : 0) + (description.includes(term) ? 1 : 0), 0)
}

const named = (candidates: Candidate[], name: string) => candidates.filter(candidate => candidate.group.name === name || candidate.tool.name === name)

const matching = (candidates: Candidate[], query: string) => {
  const terms = words(query)
  return candidates
    .map(candidate => ({ candidate, score: score(candidate, terms) }))
    .filter(scored => scored.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(scored => scored.candidate)
}

export { matching, named, type Candidate }
