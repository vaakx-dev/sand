import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Orchestrator } from '../contract'
import { group } from './group'

const defaultTimeout = 600_000
const maxTimeout = 1_800_000
const settleGrace = 30_000

const input = z.object({
  thread: z.string().describe('The thread id'),
  until: z.enum(['attention', 'end']).optional().describe('attention (default): also return when the thread waits on the user; end: only when it is done'),
  timeout_ms: z.number().int().positive().max(maxTimeout).optional().describe(`Give up after this long (default ${defaultTimeout}, max ${maxTimeout}); the thread keeps running`),
})

export const waitTool = (threads: Orchestrator): Tool<typeof input> => ({
  name: 'threads_wait',
  description: "Wait until another thread is done or waits on the user, and get its status and reply. The status is running when it timed out",
  group,
  input,
  effect: 'read',
  timeoutMs: maxTimeout + settleGrace,
  async run({ thread, until = 'attention', timeout_ms = defaultTimeout }, { conversation, signal }) {
    if (thread === conversation.id) throw new Error("A thread can't wait for itself")
    const by = { owner: conversation.owner, id: conversation.id }
    const state = await threads.wait(thread, until, AbortSignal.any([signal, AbortSignal.timeout(timeout_ms)]), by)
    signal.throwIfAborted()
    return JSON.stringify(state)
  },
})
