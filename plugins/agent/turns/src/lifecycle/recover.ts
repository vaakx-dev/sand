import { type Entry, errorResult, type Message, toolCalls, unrecorded } from '@sand/chats/contract'
import type { TurnEnding } from '@sand/turns-contract/contract'
import type { TurnsContext } from '../context'
import type { Stale, TurnStore } from '../store/turns'

const sweepEvery = 30_000

const unanswered = (entries: Entry[]) => {
  const calls = toolCalls(entries)
  for (const entry of entries) {
    if (entry.type !== 'message') continue
    for (const block of (entry.data as Message).content) if (block.type === 'tool_result') calls.delete(block.callId)
  }
  return [...calls.values()]
}

export const recoverTurns = (ctx: TurnsContext, store: TurnStore, owner: string) => {
  const recover = ({ id, session: chat, partial }: Stale) => {
    const session = ctx.sessions.open(chat)
    const turn = { turn: id }
    const lost = ctx.ledger.tx(() => {
      if (!store.lose(id)) return false
      if (!session) return true
      if (partial) session.append('message', partial, turn)
      const entries = session.path().filter(entry => entry.turn === id)
      for (const call of unanswered(entries)) session.append('message', { role: 'user', content: [errorResult(call, unrecorded)] }, turn)
      session.append('turn-ending', { stopReason: 'lost' } satisfies TurnEnding, turn)
      return true
    })
    if (lost && session && session.kind !== 'agent') ctx.sessions.update(session.id, { seen: false })
  }

  const sweep = () => store.expired(owner).forEach(recover)

  sweep()
  ctx.effect(() => {
    const timer = setInterval(sweep, sweepEvery)
    return () => clearInterval(timer)
  })
}
