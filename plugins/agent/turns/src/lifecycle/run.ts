import { type Entry, type Message, type Session, textOf } from '@sand/chats/contract'
import { type TurnEnding, turnEnd, turnReady, type TurnResult, turnStart, type TurnStatus } from '@sand/turns-contract/contract'
import { emptyUsage } from '@sand/usage/contract'
import { errorMessage, isRecord, joinDisposers } from '@sand/util'
import type { Announce } from '../announce'
import type { TurnsContext } from '../context'
import { createPartial } from '../engine/partial'
import { runReact } from '../engine/react'
import { createHooks } from '../engine/step'
import type { TurnHooks, TurnRun } from '../engine/turn'
import type { Stores } from '../store'
import type { Holding } from '../store/pending'
import type { Leases } from './lease'
import type { Started } from './start'

const statuses: Partial<Record<TurnResult['stopReason'], TurnStatus>> = { interrupted: 'interrupted', error: 'failed' }

const holdings: Partial<Record<TurnResult['stopReason'], Holding>> = { interrupted: 'all', error: 'all' }

const detailOf = (error: unknown) => (isRecord(error) && typeof error.detail === 'string' && error.detail) || undefined

const resultOf = (run: TurnRun, stopReason: TurnResult['stopReason'], failure?: { error: unknown }): TurnResult => {
  const detail = failure && detailOf(failure.error)
  return {
    stopReason,
    usage: run.usage,
    text: run.reply,
    ...(failure && { error: errorMessage(failure.error) }),
    ...(detail && { detail }),
  }
}

interface Outcome {
  stopReason: TurnResult['stopReason']
  failure?: { error: unknown }
}

export interface Driven {
  result: TurnResult
  failure?: { error: unknown }
}

export const createDriver = (ctx: TurnsContext, stores: Stores, leases: Leases, announce: Announce, ended: (session: Session) => void) => {
  const react = async (run: TurnRun, hooks: TurnHooks, prompt: Entry): Promise<Outcome> => {
    try {
      await ctx.waterfall(turnReady, prompt, run.session, run.signal)
      run.signal.throwIfAborted()
      return await runReact({ signal: run.signal, hooks })
    } catch (error) {
      return run.signal.aborted ? { stopReason: 'interrupted' } : { stopReason: 'error', failure: { error } }
    }
  }

  const close = (run: TurnRun, result: TurnResult, partial: Message | undefined) =>
    ctx.ledger.tx(() => {
      const { session, info } = run
      const ending: TurnEnding = { stopReason: result.stopReason, ...(result.error && { error: result.error }) }
      const status = statuses[result.stopReason] ?? 'completed'
      if (!stores.turns.finish(info.id, leases.owner, { ...ending, status, ...(result.detail && { detail: result.detail }) })) return false
      const turn = { turn: info.id }
      if (partial) session.append('message', partial, turn)
      if (result.stopReason !== 'end_turn') session.append('turn-ending', ending, turn)
      return stores.pending.settle(session.id, holdings[result.stopReason] ?? 'none')
    })

  const end = (run: TurnRun, { stopReason, failure }: Outcome) => {
    const partial = run.partial.message()
    if (partial) run.reply = textOf(partial.content)
    const result = resultOf(run, stopReason, failure)
    if (close(run, result, partial)) announce.pending(run.session)
    return result
  }

  return async ({ session, info, entry, user }: Started, external?: AbortSignal): Promise<Driven> => {
    const controller = new AbortController()
    const signal = external ? AbortSignal.any([external, controller.signal]) : controller.signal
    const run: TurnRun = { info, session, signal, partial: createPartial(message => stores.turns.partial(info.id, message)), usage: emptyUsage(), reply: '' }
    const hooks = createHooks(ctx, stores, announce, run)
    const release = joinDisposers(leases.hold(info.id, controller), ctx.busy(), ctx.effect(() => run.partial.stop))
    ctx.emit(turnStart, session, user, info)
    announce.turn(info.id)
    const outcome = await react(run, hooks, entry)
    let result: TurnResult
    try {
      result = end(run, outcome)
    } finally {
      release()
    }
    if (session.kind !== 'agent') ctx.sessions.update(session.id, { seen: false })
    ctx.emit(turnEnd, session, result, stores.turns.get(info.id) ?? info)
    announce.turn(info.id)
    ended(session)
    return { result, ...(outcome.failure && { failure: outcome.failure }) }
  }
}

export type Drive = ReturnType<typeof createDriver>
