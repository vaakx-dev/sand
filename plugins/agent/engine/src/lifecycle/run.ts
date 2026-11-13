import { UsageLimited } from '@sand/accounts/contract'
import { type Message, textOf } from '@sand/chats/contract'
import { runtime } from '@sand/host-runtimes/contract'
import { errorMessage, isRecord, joinDisposers } from '@sand/util'
import { type Conversation, turnClose, type TurnEnding, turnOpen, type TurnResult, type TurnStatus } from '../contract'
import type { EngineContext } from '../context'
import { createPartial } from '../loop/partial'
import { runReact } from '../loop/react'
import { createHooks } from '../loop/step'
import type { TurnHooks, TurnRun } from '../loop/turn'
import type { Owned } from '../owned'
import type { Holding } from '../store/pending'
import type { Begun } from './start'

const statuses: Partial<Record<TurnResult['stopReason'], TurnStatus>> = { interrupted: 'interrupted', error: 'failed', limited: 'failed' }

const holdings: Partial<Record<TurnResult['stopReason'], Holding>> = { interrupted: 'all', error: 'all' }

const detailOf = (error: unknown) => (isRecord(error) && typeof error.detail === 'string' && error.detail) || undefined

interface Outcome {
  stopReason: TurnResult['stopReason']
  failure?: { error: unknown }
  handed?: true
}

interface Opened<C extends Conversation> {
  run: TurnRun<C>
  hooks: TurnHooks
  release(): void
}

const resultOf = <C extends Conversation>(run: TurnRun<C>, { stopReason, failure }: Outcome): TurnResult => {
  const detail = failure && detailOf(failure.error)
  const resetsAt = failure?.error instanceof UsageLimited ? failure.error.resetsAt : undefined
  return {
    stopReason,
    usage: run.usage,
    text: run.reply,
    steps: run.steps,
    ...(failure && { error: errorMessage(failure.error) }),
    ...(detail && { detail }),
    ...(resetsAt && { resetsAt }),
  }
}

const failed = (error: unknown): Outcome => ({ stopReason: error instanceof UsageLimited ? 'limited' : 'error', failure: { error } })

export interface Driven {
  result: TurnResult
  failure?: { error: unknown }
}

export const createDriver = <C extends Conversation>(ctx: EngineContext, owned: Owned<C>, ended: (conversation: C) => void) => {
  const { conversations, stores, leases, announce } = owned

  const react = async ({ run, hooks }: Opened<C>, begun: Begun<C>, leaving: () => boolean): Promise<Outcome> => {
    try {
      if ('entry' in begun) await conversations.ready?.(begun.entry, run.conversation, run.signal)
      run.signal.throwIfAborted()
      return await runReact({ signal: run.signal, hooks, leaving }, 'calls' in begun ? begun : undefined)
    } catch (error) {
      return run.signal.aborted ? { stopReason: 'interrupted' } : failed(error)
    }
  }

  const close = (run: TurnRun<C>, result: TurnResult, partial: Message | undefined) =>
    ctx.ledger.tx(() => {
      const { conversation, info } = run
      const ending: TurnEnding = { stopReason: result.stopReason, ...(result.error && { error: result.error }), ...(result.resetsAt && { resetsAt: result.resetsAt }) }
      const status = statuses[result.stopReason] ?? 'completed'
      if (!stores.turns.finish(info.id, leases.holder, { ...ending, status, ...(result.detail && { detail: result.detail }) })) return false
      const turn = { turn: info.id }
      if (partial) conversation.append('message', partial, turn)
      if (result.stopReason !== 'end_turn') conversation.append('turn-ending', ending, turn)
      return stores.pending.settle(conversation, holdings[result.stopReason] ?? 'none')
    })

  const end = (run: TurnRun<C>, outcome: Outcome) => {
    const partial = run.partial.message()
    if (partial) run.reply = textOf(partial.content)
    const result = resultOf(run, outcome)
    if (close(run, result, partial)) announce.pending(run.conversation)
    return result
  }

  const open = (begun: Begun<C>, external?: AbortSignal): Opened<C> => {
    const { conversation, info } = begun
    const controller = new AbortController()
    const signal = external ? AbortSignal.any([external, controller.signal]) : controller.signal
    const partial = createPartial(message => stores.turns.partial(info.id, message))
    const run: TurnRun<C> = { info, conversation, signal, partial, usage: info.usage, reply: '', steps: info.step }
    const hooks = createHooks(ctx, owned, run)
    const release = joinDisposers(leases.hold(info.id, controller), ctx.busy(), ctx.effect(() => run.partial.stop))
    if ('user' in begun) conversations.started?.(conversation, begun.user, info)
    announce.turn(info.id)
    ctx.emit(turnOpen, conversation, info)
    return { run, hooks, release }
  }

  const finish = ({ run, release }: Opened<C>, outcome: Outcome): Driven => {
    const { conversation, info } = run
    let result: TurnResult
    try {
      result = end(run, outcome)
    } finally {
      release()
    }
    const finished = stores.turns.get(conversations.owner, info.id) ?? info
    conversations.ended?.(conversation, result, finished)
    announce.turn(info.id)
    ctx.emit(turnClose, conversation, result, finished)
    ended(conversation)
    return { result, ...(outcome.failure && { failure: outcome.failure }) }
  }

  const handOff = (opened: Opened<C>) => {
    const { conversation, info } = opened.run
    if (!stores.turns.handOver(info.id, leases.holder)) return void finish(opened, { stopReason: 'interrupted' })
    opened.release()
    announce.turn(info.id)
    ctx.get(runtime)?.handed(conversation.id)
  }

  const keep = () => false

  const detached = async (begun: Begun<C>) => {
    const opened = open(begun)
    const outcome = await react(opened, begun, leases.leaving)
    if (outcome.handed) handOff(opened)
    else finish(opened, outcome)
  }

  return {
    async run(begun: Begun<C>, signal?: AbortSignal) {
      const opened = open(begun, signal)
      return finish(opened, await react(opened, begun, keep))
    },
    start(begun: Begun<C>) {
      detached(begun).catch(error => ctx.report(error))
    },
  }
}

export type Drive<C extends Conversation> = ReturnType<typeof createDriver<C>>
