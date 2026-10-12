import type { FoundThread, Pcs } from '@sand/pc-link/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { threadInput } from './input'

const others = async (pcs: Pcs, session: Session, thread: string, pc?: string) => {
  const found = await pcs.thread(thread, pc)
  if (found.pc.here && found.thread.id === session.id) throw new Error('That is this thread; use another thread')
  return found
}

const named = ({ pc, thread }: FoundThread) => `"${thread.title ?? thread.id}" on ${pc.name}`

const sendInput = z.object({
  ...threadInput,
  message: z.string(),
  mode: z
    .enum(['auto', 'steer', 'queue'])
    .default('auto')
    .describe('auto joins a running turn or starts one; steer only joins a running turn; queue waits until the current turn ends'),
})

export const sendTool = (pcs: Pcs): Tool<typeof sendInput> => ({
  name: 'thread_send',
  group: 'threads',
  description: 'Send a message to another thread on any PC. The thread and its agent see that it came from this thread.',
  input: sendInput,
  async run({ thread, pc, message, mode }, { session }) {
    const found = await others(pcs, session, thread, pc)
    const from = await pcs.link(session)
    const target = { session: found.thread.id, prompt: message, from }
    if (mode !== 'queue' && (await pcs.call<string | null>({ type: 'loop.steer', ...target }, found.pc.id))) return `Sent into the running turn of ${named(found)}.`
    if (mode === 'steer') throw new Error(`${named(found)} is not running a turn; use mode auto or queue`)
    await pcs.call({ type: 'queue.add', ...target }, found.pc.id)
    return mode === 'queue' ? `Queued for ${named(found)}; it runs once the thread is idle.` : `${named(found)} was idle, so the message started a turn.`
  },
})

const stopInput = z.object(threadInput)

export const stopTool = (pcs: Pcs): Tool<typeof stopInput> => ({
  name: 'thread_stop',
  group: 'threads',
  description: 'Stop the running turn of another thread on any PC.',
  input: stopInput,
  async run({ thread, pc }, { session }) {
    const found = await others(pcs, session, thread, pc)
    const stopped = await pcs.call<boolean>({ type: 'loop.interrupt', session: found.thread.id }, found.pc.id)
    return stopped ? `Stopped the turn of ${named(found)}.` : `${named(found)} was not running.`
  },
})
