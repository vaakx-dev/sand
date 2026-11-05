import { type Entry, errorResult, type Message, toolCalls, unrecorded } from '@sand/chats/contract'
import type { TurnEnding } from '@sand/turns-contract/contract'
import type { Announce } from '../announce'
import type { TurnsContext } from '../context'
import type { Stores } from '../store'
import type { Stale } from '../store/turns'

const sweepEvery = 30_000

const unanswered = (entries: Entry[]) => {
  const calls = toolCalls(entries)
  for (const entry of entries) {
    if (entry.type !== 'message') continue
    for (const block of (entry.data as Message).content) if (block.type === 'tool_result') calls.delete(block.callId)
  }
  return [...calls.values()]
}

export const recoverTurns = (ctx: TurnsContext, stores: Stores, owner: string, announce: Announce) => {
  const recover = ({ id, session: chat, thread, partial }: Stale) => {
    const session = ctx.sessions.open(chat)
    const turn = { turn: id }
    const lost = ctx.ledger.tx(() => {
      if (!stores.turns.lose(id)) return false
      if (thread) ctx.providerThreads.abandon(thread)
      if (!session) return true
      if (partial) session.append('message', partial, turn)
      const entries = session.path().filter(entry => entry.turn === id)
      for (const call of unanswered(entries)) session.append('message', { role: 'user', content: [errorResult(call, unrecorded)] }, turn)
      session.append('turn-ending', { stopReason: 'lost' } satisfies TurnEnding, turn)
      stores.pending.settle(chat, 'user')
      return true
    })
    if (!lost || !session) return
    if (session.kind !== 'agent') ctx.sessions.update(session.id, { seen: false })
    announce.turn(id)
    announce.pending(session)
  }

  const sweep = () => stores.turns.expired(owner).forEach(recover)

  sweep()
  ctx.effect(() => {
    const timer = setInterval(sweep, sweepEvery)
    return () => clearInterval(timer)
  })
}
