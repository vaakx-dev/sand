import { threadList, threadStop } from '@sand/orchestrator/contract'
import { z } from 'zod'
import type { McpTool } from '@sand/mcp-server/contract'

const empty = z.object({})
const thread = z.object({ thread: z.string() })

export const testTools: McpTool[] = [
  { name: 'list', description: 'List threads', input: empty, access: 'read', run: (_, { call }) => call(threadList, {}) } satisfies McpTool<typeof empty>,
  {
    name: 'stop',
    description: 'Stop a thread',
    input: thread,
    access: 'operate',
    run: ({ thread }, { call }) => call(threadStop, { session: thread }),
  } satisfies McpTool<typeof thread>,
  { name: 'here', description: 'Where the agent runs', input: empty, access: 'read', run: async (_, { here }) => ({ here }) } satisfies McpTool<typeof empty>,
]
