import type { McpTool } from '@sand/mcp-server/contract'
import { z } from 'zod'
import { changesMerge } from './contract'

const input = z.object({ thread: z.string().optional().describe('The thread id (default: you, when you are a thread)') })

export const mergeTool: McpTool<typeof input> = {
  name: 'thread_merge',
  description:
    "Merge a thread's worktree into its project folder's branch on this PC as one commit, then remove the worktree and archive the thread. Nothing is pushed. Refuses a running thread or a project folder with uncommitted changes",
  input,
  access: 'operate',
  group: 'threads',
  run: ({ thread }, { call }) => call(changesMerge, thread ? { session: thread } : {}),
}
