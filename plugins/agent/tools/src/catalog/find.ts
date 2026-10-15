import type { ToolResultContent } from '@sand/messages'
import type { GroupState, Tool } from '../contract'
import { z } from 'zod'
import { search, type Candidate } from './search'

const input = z.object({
  query: z.string().describe('Words to match against tool names and descriptions, or a group name to load the whole group'),
})

const groupLine = (group: GroupState) => `- ${group.name}: ${group.summary} (${group.tools.join(', ')})`

const describe = (groups: GroupState[]) =>
  `Load tools that aren't loaded yet. The tools you find stay available for the rest of this thread.\n\nGroups:\n${groups.map(groupLine).join('\n')}`

const listing = (found: Candidate[]): ToolResultContent[] => [
  { type: 'text', text: `Loaded:\n${found.map(({ tool }) => `- ${tool.name}: ${tool.description}`).join('\n')}` },
  ...found.map(({ tool }): ToolResultContent => ({ type: 'tool_reference', name: tool.name })),
]

export const findName = 'find_tools'

export const findTool = (groups: GroupState[], candidates: Candidate[]): Tool<typeof input> => ({
  name: findName,
  description: describe(groups),
  parallel: true,
  input,
  run({ query }) {
    const found = search(candidates, query)
    return found.length ? listing(found) : `No tools match "${query}". Try other words or a group name.`
  },
})
