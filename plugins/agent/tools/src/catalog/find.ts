import type { ToolResultContent } from '@sand/chats/contract'
import { findName, type Tool, type ToolGroup } from '../contract'
import { z } from 'zod'
import { matching, named, type Candidate } from './search'

interface Finding {
  candidates: Candidate[]
  present: Candidate[]
  loaded: ReadonlySet<string>
  blocked: ReadonlyMap<string, string>
}

const input = z.object({
  query: z.string().describe('Words to match against tool names and descriptions, or a group name to load the whole group'),
})

const namesOf = (candidates: Candidate[]) => candidates.map(({ tool }) => tool.name).join(', ')

const groupsOf = (candidates: Candidate[]) => {
  const groups = new Map<ToolGroup, Candidate[]>()
  for (const candidate of candidates) groups.set(candidate.group, [...(groups.get(candidate.group) ?? []), candidate])
  return [...groups].sort(([a], [b]) => a.label.localeCompare(b.label))
}

const describe = (candidates: Candidate[]) => {
  const lines = groupsOf(candidates).map(([group, members]) => `- ${group.name}: ${group.summary} (${namesOf(members)})`)
  return `Load tools that aren't loaded yet. The tools you find stay available for the rest of this chat.\n\nGroups:\n${lines.join('\n')}`
}

const listing = (found: Candidate[], { present, loaded }: Finding): ToolResultContent[] => {
  const alwaysLoaded = new Set(present)
  const deferred = found.filter(candidate => !alwaysLoaded.has(candidate))
  const fresh = deferred.filter(({ tool }) => !loaded.has(tool.name))
  const again = found.filter(candidate => !fresh.includes(candidate))
  const lines = [...(fresh.length ? [`Loaded: ${namesOf(fresh)}`] : []), ...(again.length ? [`Already loaded: ${namesOf(again)}`] : [])]
  return [{ type: 'text', text: lines.join('\n') }, ...deferred.map(({ tool }): ToolResultContent => ({ type: 'tool_reference', name: tool.name }))]
}

const answer = (finding: Finding, query: string) => {
  const searchable = [...finding.candidates, ...finding.present]
  const name = query.trim().toLowerCase()
  const whole = named(searchable, name)
  if (whole.length) return listing(whole, finding)
  const unavailable = finding.blocked.get(name)
  if (unavailable) return `${unavailable} isn't available in this chat.`
  const found = matching(searchable, query)
  return found.length ? listing(found, finding) : `No tools match "${query}". Try other words or a group name.`
}

const findTool = (finding: Finding): Tool<typeof input> => ({
  name: findName,
  description: describe(finding.candidates),
  parallel: true,
  effect: 'read',
  input,
  run: ({ query }) => answer(finding, query),
})

export { findTool }
