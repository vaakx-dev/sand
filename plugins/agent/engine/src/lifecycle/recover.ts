import { type Entry, errorResult, type Message, toolCalls, unrecorded } from '@sand/chats/contract'
import type { Conversation, TurnEnding } from '../contract'
import type { EngineContext } from '../context'
import type { Owned } from '../owned'
import type { Stale } from '../store/turns'
import type { Drive } from './run'

export interface RecoveryDeps<C extends Conversation> {
  drive: Drive<C>
  resumes(): boolean
}

const unanswered = (entries: Entry[]) => {
  const calls = toolCalls(entries)
  for (const entry of entries) {
    if (entry.type !== 'message') continue
    for (const block of (entry.data as Message).content) if (block.type === 'tool_result') calls.delete(block.callId)
  }
  return [...calls.values()]
}

export const createRecovery = <C extends Conversation>(
  ctx: EngineContext,
  { conversations, stores, leases, announce }: Owned<C>,
  { drive, resumes }: RecoveryDeps<C>,
) => {
  const settle = (conversation: C, stale: Stale, keep: Set<string>) => {
    const turn = { turn: stale.id }
    if (stale.partial) conversation.append('message', stale.partial, turn)
    const calls = unanswered(conversation.path().filter(entry => entry.turn === stale.id))
    for (const call of calls) if (!keep.has(call.id)) conversation.append('message', { role: 'user', content: [errorResult(call, unrecorded)] }, turn)
    return calls.filter(call => keep.has(call.id))
  }

  const lose = (stale: Stale) => {
    const conversation = conversations.open(stale.conversation)
    const lost = ctx.ledger.tx(() => {
      if (!stores.turns.lose(stale.id)) return false
      if (stale.thread) conversations.abandon?.(stale.thread)
      if (!conversation) return true
      settle(conversation, stale, new Set())
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

  const resume = (stale: Stale, durable: Set<string>) => {
    const conversation = conversations.open(stale.conversation)
    if (!conversation) return lose(stale)
    const resumed = ctx.ledger.tx(() => {
      const info = stores.turns.adopt(stale.id, leases.holder, leases.until())
      return info && { conversation, info, calls: settle(conversation, stale, durable) }
    })
    if (!resumed) return lose(stale)
    drive.start(resumed)
  }

  const recover = (stale: Stale) => {
    const durable = new Set(stale.waits.flatMap(reason => (reason.durable ? [reason.call] : [])))
    if (!durable.size) return lose(stale)
    if (resumes()) resume(stale, durable)
  }

  return () => stores.turns.expired(conversations.owner, leases.holder).forEach(recover)
}
