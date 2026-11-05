import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { OrchestratorContext } from '../context'
import { findThread } from '../find'
import { waitThread } from '../state'
import { group } from './group'

const defaultTimeout = 600_000
const maxTimeout = 1_800_000
const settleGrace = 30_000

const input = z.object({
  thread: z.string().describe('The thread id'),
  until: z.enum(['attention', 'end']).optional().describe('attention (default): also return when the thread waits on the user; end: only when it is done'),
  timeout_ms: z.number().int().positive().max(maxTimeout).optional().describe(`Give up after this long (default ${defaultTimeout}, max ${maxTimeout}); the thread keeps running`),
})

export const waitTool = (ctx: OrchestratorContext): Tool<typeof input> => ({
  name: 'threads_wait',
  description: "Wait until another thread is done or waits on the user, and get its status and reply. The status is running when it timed out",
  group,
  input,
  timeoutMs: maxTimeout + settleGrace,
  async run({ thread, until = 'attention', timeout_ms = defaultTimeout }, { session, signal }) {
    if (thread === session.id) throw new Error("A thread can't wait for itself")
    const state = await waitThread(ctx, findThread(ctx, thread), until, AbortSignal.any([signal, AbortSignal.timeout(timeout_ms)]))
    signal.throwIfAborted()
    return JSON.stringify(state)
  },
})
