import type { ToolResultContent } from '@sand/chats/contract'
import { findName, type GroupState, type Tool } from '../contract'
import { z } from 'zod'
import { search, type Candidate } from './search'
import { spec } from './spec'

interface Finder {
  line(group: GroupState): string
  listing(found: Candidate[]): ToolResultContent[]
}

const input = z.object({
  query: z.string().describe('Words to match against tool names and descriptions, or a group name to load the whole group'),
})

const loadedText = (found: Candidate[]) => `Loaded: ${found.map(({ tool }) => tool.name).join(', ')}`

const signature = (tool: Tool) => {
  const { description, inputSchema } = spec(tool)
  return `## ${tool.name}\n${description}\nInput: ${JSON.stringify(inputSchema)}`
}

const referenced: Finder = {
  line: group => `- ${group.name}: ${group.summary} (${group.tools.join(', ')})`,
  listing: found => [{ type: 'text', text: loadedText(found) }, ...found.map(({ tool }): ToolResultContent => ({ type: 'tool_reference', name: tool.name }))],
}

const described: Finder = {
  line: group => `- ${group.name}: ${group.summary}`,
  listing: found => [{ type: 'text', text: [loadedText(found), ...found.map(({ tool }) => signature(tool))].join('\n\n') }],
}

const describe = (finder: Finder, groups: GroupState[]) =>
  `Load tools that aren't loaded yet. The tools you find stay available for the rest of this chat.\n\nGroups:\n${groups.map(finder.line).join('\n')}`

const findTool = (finder: Finder, groups: GroupState[], candidates: Candidate[]): Tool<typeof input> => ({
  name: findName,
  description: describe(finder, groups),
  parallel: true,
  effect: 'read',
  input,
  run({ query }) {
    const found = search(candidates, query)
    return found.length ? finder.listing(found) : `No tools match "${query}". Try other words or a group name.`
  },
})

export { described, findTool, referenced }
