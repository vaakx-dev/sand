import type { Session } from '@sand/chats/contract'
import { agentLimits } from '@sand/subagents/contract'
import type { Tool } from '@sand/tools/contract'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { OrchestratorContext } from '../context'
import type { Adopt, Start } from '../start'
import { group, requestOf } from './group'

const input = z.object({
  prompt: z.string().min(1).describe('The first message'),
  cwd: z.string().optional().describe('The folder it works in (default: yours)'),
  title: z.string().optional(),
  model: z.string().optional().describe("A model id or name (default: sand's default model)"),
  effort: z.string().optional().describe('Reasoning effort'),
  worktree: z.boolean().optional().describe('Work in a new git worktree on its own branch'),
})

const adopting = (ctx: OrchestratorContext, parent: Session): Adopt | undefined => {
  const limits = ctx.get(agentLimits)
  if (!limits) return undefined
  const scope = limits.child(parent, 'thread')
  return thread => limits.give(thread, scope)
}

export const startTool = (ctx: OrchestratorContext, start: Start): Tool<typeof input> => ({
  name: 'threads_start',
  description:
    'Start a new thread with a first message. It shows in the sidebar like any thread, runs with your tool limits and keeps working after your turn ends. Returns at once with its id; use threads_wait for its reply',
  group,
  input,
  async run({ cwd = '.', ...rest }, { session, call }) {
    const request = { ...rest, cwd: resolve(session.cwd, cwd), origin: 'agent', clientRequestId: requestOf(session, call) } as const
    return JSON.stringify(await start(request, adopting(ctx, session)))
  },
})
