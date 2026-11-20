import type { ConversationRef } from '@sand/engine/contract'
import { turnPending } from '@sand/turns-contract/contract'
import { untilAborted } from '@sand/util'
import type { OrchestratorContext } from './context'
import { type ThreadState, waitThread as waitAway } from './contract'
import { findThread } from './find'
import type { Pcs } from './pcs'
import { waitThread } from './state'
import type { Waits } from './waits'

const messaged = (ctx: OrchestratorContext, by: ConversationRef) => {
  const session = ctx.sessions.open(by.id)
  return Boolean(session && ctx.turns.pending(session).some(item => !item.held))
}

const heardFrom = (ctx: OrchestratorContext, by: ConversationRef) => {
  const heard = new AbortController()
  const check = () => void (messaged(ctx, by) && heard.abort())
  const stop = ctx.on(turnPending, changed => void (changed.id === by.id && check()))
  check()
  return { signal: heard.signal, stop }
}

export const createAnswer =
  (ctx: OrchestratorContext, waits: Waits, pcs: Pcs, answered: Set<string>) =>
  (thread: string, by: ConversationRef, signal: AbortSignal) =>
    waits.during(by, thread, async (): Promise<ThreadState> => {
      const heard = heardFrom(ctx, by)
      const until = AbortSignal.any([signal, heard.signal])
      try {
        const pc = await pcs.ownerOf(thread)
        if (!pc) return await waitThread(ctx, findThread(ctx, thread), 'end', until)
        const away = waitAway((request, input, options) => pcs.call(pc, request, input, options?.timeout), thread, 'end', Infinity, until)
        away.catch(() => {})
        const state = await untilAborted(away, until).catch((error): ThreadState => {
          if (until.aborted) return { thread, status: 'running' }
          throw error
        })
        if (state.turn && !until.aborted) answered.add(`${thread}@${state.turn}`)
        return state
      } finally {
        void heard.stop()
      }
    })
