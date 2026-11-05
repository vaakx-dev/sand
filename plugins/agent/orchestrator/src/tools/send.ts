import { agentLimits } from '@sand/subagents/contract'
import type { Tool } from '@sand/tools/contract'
import { sendModes } from '@sand/turns-contract/contract'
import { z } from 'zod'
import type { OrchestratorContext } from '../context'
import { findThread } from '../find'
import { group, requestOf } from './group'

const input = z.object({
  thread: z.string().describe('The thread id'),
  prompt: z.string().min(1).describe('The message'),
  mode: z.enum(sendModes).optional().describe('auto (default): a running turn takes it at its next step, an idle thread starts a turn; queue: run it as the next turn'),
})

export const sendTool = (ctx: OrchestratorContext): Tool<typeof input> => ({
  name: 'threads_send',
  description: 'Send a message to another thread. Returns at once; use threads_wait for its reply',
  group,
  input,
  async run({ thread, ...rest }, { session, call }) {
    const target = findThread(ctx, thread)
    if (ctx.get(agentLimits)?.covers(session, target) === false) throw new Error(`Thread ${thread} may use tools you may not, so you can't message it`)
    const sent = await ctx.turns.send(target, { ...rest, origin: 'agent', clientRequestId: requestOf(session, call) })
    return JSON.stringify({ ...sent, thread })
  },
})
