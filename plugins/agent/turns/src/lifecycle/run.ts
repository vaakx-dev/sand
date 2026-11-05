import { type Entry, type Message, type Prompt, type Session, textOf } from '@sand/chats/contract'
import { turnEnd, turnReady, turnStart } from '@sand/loop/contract'
import type { RunOptions, TurnEnding, TurnResult, TurnStatus } from '@sand/turns-contract/contract'
import { emptyUsage } from '@sand/usage/contract'
import { errorMessage, isRecord, joinDisposers } from '@sand/util'
import type { TurnsContext } from '../context'
import { createPartial } from '../engine/partial'
import { runReact } from '../engine/react'
import { createHooks } from '../engine/step'
import type { TurnHooks, TurnRun } from '../engine/turn'
import type { TurnStore } from '../store/turns'
import type { Leases } from './lease'
import { turnStarter } from './start'

const statuses: Partial<Record<TurnResult['stopReason'], TurnStatus>> = { interrupted: 'interrupted', error: 'failed' }

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

export const turnRunner = (ctx: TurnsContext, store: TurnStore, leases: Leases) => {
  const start = turnStarter(ctx, store, leases)

  const react = async (run: TurnRun, hooks: TurnHooks, prompt: Entry): Promise<Outcome> => {
    try {
      await ctx.waterfall(turnReady, prompt, run.session, run.signal)
      run.signal.throwIfAborted()
      return await runReact({ signal: run.signal, hooks })
    } catch (error) {
      return run.signal.aborted ? { stopReason: 'interrupted' } : { stopReason: 'error', failure: { error } }
    }
  }

  const close = (run: TurnRun, result: TurnResult, closing: Message[]) =>
    ctx.ledger.tx(() => {
      const { session, info } = run
      const ending: TurnEnding = { stopReason: result.stopReason, ...(result.error && { error: result.error }) }
      const status = statuses[result.stopReason] ?? 'completed'
      if (!store.finish(info.id, leases.owner, { ...ending, status, ...(result.detail && { detail: result.detail }) })) return
      const turn = { turn: info.id }
      for (const message of closing) session.append('message', message, turn)
      if (result.stopReason !== 'end_turn') session.append('turn-ending', ending, turn)
    })

  const end = async (run: TurnRun, hooks: TurnHooks, { stopReason, failure }: Outcome) => {
    const leftovers = await hooks.inbox()
    const partial = run.partial.message()
    if (partial) run.reply = textOf(partial.content)
    const result = resultOf(run, stopReason, failure)
    close(run, result, [...(partial ? [partial] : []), ...(leftovers.length ? [{ role: 'user', content: leftovers } satisfies Message] : [])])
    return result
  }

  return async (session: Session, prompt: Prompt, { signal: external }: RunOptions = {}): Promise<TurnResult> => {
    const { info, entry, user } = await start(session, prompt)
    const controller = new AbortController()
    const signal = external ? AbortSignal.any([external, controller.signal]) : controller.signal
    const run: TurnRun = { info, session, signal, partial: createPartial(message => store.partial(info.id, message)), usage: emptyUsage(), reply: '' }
    const hooks = createHooks(ctx, store, run)
    const release = joinDisposers(leases.hold(info.id, controller), ctx.busy(), ctx.effect(() => run.partial.stop))
    ctx.emit(turnStart, session, user, info)
    const outcome = await react(run, hooks, entry)
    const result = await end(run, hooks, outcome).finally(release)
    if (session.kind !== 'agent') ctx.sessions.update(session.id, { seen: false })
    ctx.emit(turnEnd, session, result, store.get(info.id) ?? info)
    if (outcome.failure) throw outcome.failure.error
    return result
  }
}
