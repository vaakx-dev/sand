import type { GroupState, Tool } from '../contract'

export interface Candidate {
  tool: Tool
  group: GroupState
}

const limit = 5

const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 1)

const score = ({ tool, group }: Candidate, terms: string[]) => {
  const name = tool.name.toLowerCase()
  const about = `${group.name} ${group.label} ${group.summary}`.toLowerCase()
  const description = tool.description.toLowerCase()
  return terms.reduce((sum, term) => sum + (name.includes(term) ? 3 : 0) + (about.includes(term) ? 2 : 0) + (description.includes(term) ? 1 : 0), 0)
}

export const search = (candidates: Candidate[], query: string) => {
  const wanted = query.trim().toLowerCase()
  const whole = candidates.filter(candidate => candidate.group.name === wanted || candidate.tool.name === wanted)
  if (whole.length) return whole
  const terms = words(query)
  return candidates
    .map(candidate => ({ candidate, score: score(candidate, terms) }))
    .filter(scored => scored.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(scored => scored.candidate)
}
