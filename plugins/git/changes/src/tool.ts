import type { McpTool } from '@sand/mcp-server/contract'
import { z } from 'zod'
import { changesMerge } from './contract'

const input = z.object({ thread: z.string().optional().describe('The thread id (default: you, when you are a thread)') })

export const mergeTool: McpTool<typeof input> = {
  name: 'thread_merge',
  description: [
    "Merge a thread's work into its project on this PC, for a thread that has its own worktree.",
    "Commits what's uncommitted there, adds it to the project folder's branch as one commit titled with the thread's title, then removes the worktree and archives the thread.",
    "Nothing is pushed. Returns the thread's changes with state merged, or conflict with the files that clash; a running thread or a project folder with uncommitted changes is refused with the reason, and no work is lost either way",
  ].join(' '),
  input,
  access: 'operate',
  group: 'threads',
  run: ({ thread }, { call }) => call(changesMerge, thread ? { session: thread } : {}),
}
