import { promptText, textOf } from '@sand/kit'
import type { TurnEnding } from '@sand/loops/contract'
import type { Entry, Message } from '@sand/messages'
import type { FoundThread, Pcs } from '@sand/pc-link/contract'
import type { OpenedSession } from '@sand/server/contract'
import type { EntryPage, ThreadLink } from '@sand/sessions-sqlite/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { threadLine } from '../format'
import { threadInput } from './input'

const messageLimit = 4000

const input = z.object({ ...threadInput, last: z.number().int().min(1).max(100).default(10).describe('How many messages to show') })

const clip = (text: string) => (text.length > messageLimit ? `${text.slice(0, messageLimit)}…` : text)

const assistantText = (message: Message) => {
  const tools = message.content.flatMap(block => (block.type === 'tool_call' ? [block.name] : []))
  const used = tools.length ? `(used ${tools.join(', ')})` : ''
  return [textOf(message.content), used].filter(Boolean).join('\n')
}

const lines = (entries: Entry[]) => {
  let sender: ThreadLink | undefined
  return entries.flatMap(entry => {
    if (entry.type === 'sent-by') sender = entry.data as ThreadLink
    if (entry.type !== 'message') return []
    const message = entry.data as Message
    const text = message.role === 'user' ? promptText(message, '\n\n') : assistantText(message)
    if (!text) return []
    const who = message.role === 'user' && sender ? `user, sent by agent thread ${sender.session} on ${sender.name}` : message.role
    if (message.role === 'user') sender = undefined
    return [`[${who}] ${clip(text)}`]
  })
}

const ending = (entries: Entry[]) => {
  const last = entries.at(-1)
  if (last?.type !== 'turn-ending') return []
  const { stopReason, error } = last.data as TurnEnding
  return [`Its last turn stopped early (${stopReason})${error ? `: ${error}` : ''}`]
}

const pageLimit = 200

const older = async (pcs: Pcs, found: FoundThread, entries: Entry[], last: number) => {
  let loaded = entries
  while (loaded[0]?.parent && lines(loaded).length < last) {
    const page = await pcs.call<EntryPage>({ type: 'session.page', session: found.thread.id, before: loaded[0].id, limit: pageLimit }, found.pc.id)
    if (!page.entries.length) break
    loaded = [...page.entries, ...loaded]
  }
  return loaded
}

export const readTool = (pcs: Pcs): Tool<typeof input> => ({
  name: 'thread_read',
  group: 'threads',
  description: "Read a thread's latest messages on any PC, and whether it is running.",
  input,
  async run({ thread, pc, last }) {
    const found = await pcs.thread(thread, pc)
    const opened = await pcs.call<OpenedSession>({ type: 'session.open', session: found.thread.id }, found.pc.id)
    const shown = lines(await older(pcs, found, opened.entries, last)).slice(-last)
    const state = opened.live ? 'running a turn now' : 'idle'
    return [threadLine(found), `It is ${state}. Last ${shown.length} messages:`, ...shown, ...ending(opened.entries)].join('\n\n')
  },
})
