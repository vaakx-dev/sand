import type { Pcs } from '@sand/pc-link/contract'
import type { SessionInfo } from '@sand/sessions-sqlite/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { threadInput } from './input'

const group = 'threads'

const renameInput = z.object({ ...threadInput, thread: threadInput.thread.optional().describe('Thread id or name. Defaults to this thread'), title: z.string().min(1) })

export const renameTool = (pcs: Pcs): Tool<typeof renameInput> => ({
  name: 'thread_rename',
  group,
  description: 'Rename this thread, or another thread on any PC.',
  input: renameInput,
  async run({ thread, pc, title }, { session }) {
    const found = thread ? await pcs.thread(thread, pc) : { pc: await pcs.find(), thread: session }
    await pcs.call({ type: 'session.rename', session: found.thread.id, title, named: true }, found.pc.id)
    return `Renamed ${found.thread.id} on ${found.pc.name} to "${title}".`
  },
})

const forkInput = z.object(threadInput)

export const forkTool = (pcs: Pcs): Tool<typeof forkInput> => ({
  name: 'thread_fork',
  group,
  description: 'Copy a thread on any PC into a new thread on the same PC, to try another direction.',
  input: forkInput,
  async run({ thread, pc }) {
    const found = await pcs.thread(thread, pc)
    const fork = await pcs.call<SessionInfo>({ type: 'sessions.branch', session: found.thread.id, into: Bun.randomUUIDv7() }, found.pc.id)
    pcs.remember(fork.id, found.pc)
    return `Forked into thread ${fork.id} on ${found.pc.name}.`
  },
})

const organizeInput = z.object({
  ...threadInput,
  pin: z.boolean().optional().describe('Pin to the top of the sidebar, or unpin'),
  archive: z.boolean().optional().describe('Archive (settle) the thread, or bring it back'),
})

export const organizeTool = (pcs: Pcs): Tool<typeof organizeInput> => ({
  name: 'thread_organize',
  group,
  description: 'Pin or unpin, archive or unarchive a thread on any PC.',
  input: organizeInput,
  async run({ thread, pc, pin, archive }) {
    if (pin === undefined && archive === undefined) throw new Error('Give pin or archive')
    const found = await pcs.thread(thread, pc)
    const session = found.thread.id
    if (pin !== undefined) await pcs.call({ type: 'session.pin', session, pinned: pin }, found.pc.id)
    if (archive !== undefined) await pcs.call({ type: 'session.settle', session, settled: archive }, found.pc.id)
    const done = [pin !== undefined && (pin ? 'pinned' : 'unpinned'), archive !== undefined && (archive ? 'archived' : 'unarchived')].filter(Boolean)
    return `${session} on ${found.pc.name} is ${done.join(' and ')}.`
  },
})
