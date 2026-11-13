import { type Entry, errorResult, type Message, type ToolCallBlock, toolCalls, unrecorded } from '@sand/chats/contract'
import type { Conversation, TurnEnding } from '../contract'
import type { EngineContext } from '../context'
import type { Owned } from '../owned'
import type { Stale } from '../store/turns'
import type { Drive } from './run'

const mostRecoveries = 3
const handoverGraceMs = 5_000

export interface RecoveryDeps<C extends Conversation> {
  drive: Drive<C>
  running(): boolean
}

const messages = (entries: Entry[]) => entries.flatMap(entry => (entry.type === 'message' ? [entry.data as Message] : []))

const unanswered = (entries: Entry[]) => {
  const calls = toolCalls(entries)
  for (const message of messages(entries)) for (const block of message.content) if (block.type === 'tool_result') calls.delete(block.callId)
  return [...calls.values()]
}

const interrupted = (call: ToolCallBlock, output: string | undefined) =>
  errorResult(call, output ? `${unrecorded}\n\nIts last output:\n${output}` : unrecorded)

export const createRecovery = <C extends Conversation>(
  ctx: EngineContext,
  { conversations, stores, leases, announce }: Owned<C>,
  { drive, running }: RecoveryDeps<C>,
) => {
  const settle = (conversation: C, stale: Stale, rerun: (call: ToolCallBlock) => boolean) => {
    const entries = conversation.path().filter(entry => entry.turn === stale.id)
    const calls = unanswered(entries)
    for (const call of calls)
      if (!rerun(call)) conversation.append('message', { role: 'user', content: [interrupted(call, stale.outputs[call.id])] }, { turn: stale.id })
    return { calls, replied: !calls.length && messages(entries).at(-1)?.role === 'assistant' }
  }

  const lose = (stale: Stale) => {
    const conversation = conversations.open(stale.conversation)
    const lost = ctx.ledger.tx(() => {
      if (!stores.turns.lose(stale.id)) return false
      if (stale.thread) conversations.abandon?.(stale.thread)
      if (!conversation) return true
      if (stale.partial) conversation.append('message', stale.partial, { turn: stale.id })
      settle(conversation, stale, () => false)
      conversation.append('turn-ending', { stopReason: 'lost' } satisfies TurnEnding, { turn: stale.id })
      stores.pending.settle(conversation, 'user')
      return true
    })
    if (!lost || !conversation) return
    const info = stores.turns.get(conversations.owner, stale.id)
    if (info) conversations.lost?.(conversation, info)
    announce.turn(stale.id)
    announce.pending(conversation)
  }

  const rerunnable = (conversation: C) => {
    const secrets = ctx.tools.secrets()
    return (call: ToolCallBlock) => ctx.tools.effect(call, conversation) === 'read' && !secrets.has(call.name)
  }

  const resume = (stale: Stale) => {
    const conversation = conversations.open(stale.conversation)
    if (!conversation || (!stale.handed && stale.recoveries >= mostRecoveries)) return lose(stale)
    const resumed = ctx.ledger.tx(() => {
      const info = stores.turns.adopt(stale.id, leases.holder, leases.until())
      if (!info) return undefined
      const rerun = rerunnable(conversation)
      const { calls, replied } = settle(conversation, stale, rerun)
      if (stale.thread && !stale.handed && !calls.length && !replied) conversations.abandon?.(stale.thread)
      return { conversation, info, calls: calls.filter(rerun), replied }
    })
    if (!resumed) return lose(stale)
    drive.start(resumed)
  }

  const due = (released: ReadonlySet<string>) => (stale: Stale) =>
    !stale.handed || released.has(stale.conversation) || Date.now() - stale.handed.at >= handoverGraceMs

  return (released: ReadonlySet<string> = new Set()) => {
    if (running()) stores.turns.expired(conversations.owner, leases.holder).filter(due(released)).forEach(resume)
  }
}
