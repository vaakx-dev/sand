import { statelessCaps, ThreadLost } from '@sand/accounts/contract'
import type { Message, Session } from '@sand/chats/contract'
import { contextLimits } from '@sand/compaction/contract'
import type { Selection } from '@sand/model/contract'
import {
  type HandoffStrategy,
  type ProviderThreadInfo,
  type ProviderThreads,
  stepPrepare,
  stepTools,
  type Transition,
  type TurnInfo,
} from '@sand/turns-contract/contract'
import { adoption, contextOf } from './adopt'
import type { ThreadsContext } from './context'
import { budgetOf, currentOf, fits, nativeOf, windowOf } from './handoff/budget'
import { handOff } from './handoff/deliver'
import { decide } from './policy'
import { currentPath, madeBy } from './current'
import { buildRequest } from './request'
import type { HandoffStore } from './store/handoffs'
import type { ThreadStore } from './store/threads'
import { compactedSince, extended, onPath } from './view/basis'
import { historyBefore, type Path } from './view/path'

export interface Stores {
  threads: ThreadStore
  handoffs: HandoffStore
}

interface Chosen {
  thread: ProviderThreadInfo
  transition: Transition
}

interface Step {
  session: Session
  turn: TurnInfo
  path: Path
  current: number
}

const same = (thread: ProviderThreadInfo, { source, model }: Selection) => thread.source === source && thread.model === model

const promptOf = (path: Path, id: string) => (path.entries[path.index.get(id) ?? -1]?.data as Message | undefined)?.content ?? []

export const createThreads = (ctx: ThreadsContext, stores: Stores, cap: number): ProviderThreads => {
  const systemOf = (session: Session, model: string) => ctx.context.system(session, model)
  const capsOf = (model: string) => ctx.llm.caps?.(model) ?? statelessCaps()

  const retire = (thread: string) => {
    stores.threads.retire(thread)
    ctx.llm.release?.(thread)
  }

  const create = async (session: Session, selection: Selection) =>
    stores.threads.create({ session: session.id, selection, system: await systemOf(session, selection.model), seen: [], used: Date.now() })

  const adopt = async (session: Session, path: Path, target: Selection) => {
    const { system, ...found } = adoption(path, target)
    return stores.threads.create({ session: session.id, ...found, system: system ?? (await systemOf(session, found.selection.model)) })
  }

  const roomFor = (thread: ProviderThreadInfo, native: number, current: number) => ({
    cap,
    window: windowOf(ctx.llm.find?.(thread.model)?.context, ctx.get(contextLimits)?.limit(thread.model)),
    native,
    current,
  })

  const nativeFor = async ({ session }: Step, thread: ProviderThreadInfo, strategy: HandoffStrategy) => {
    if (strategy === 'delta') return thread.context
    return nativeOf(thread.system, await ctx.waterfall(stepTools, ctx.context.tools(session, []), session))
  }

  const handOver = async (step: Step, thread: ProviderThreadInfo, strategy: HandoffStrategy) => {
    const budget = budgetOf(roomFor(thread, await nativeFor(step, thread, strategy), step.current))
    const made = madeBy(ctx, step.path)
    return ctx.ledger.tx(() => {
      const seen = handOff(stores.handoffs, { ...step, thread, strategy, made, budget })
      if (!seen) return thread
      stores.threads.see(thread.id, seen)
      return { ...thread, seen }
    })
  }

  const choose = async (step: Step): Promise<Chosen> => {
    const { session, turn, path } = step
    const { selection } = turn
    const history = historyBefore(path, turn.prompt)
    const open = stores.threads.open(session.id)
    const threads = open.length || !history || stores.threads.known(session.id) ? open : [await adopt(session, path, selection)]
    const target = threads.find(thread => same(thread, selection))
    const candidate = target && {
      thread: target,
      last: target === threads[0],
      onPath: onPath(target.seen, path),
      compacted: compactedSince(target.id, target.seen, path),
      fits: fits(roomFor(target, target.context, step.current)),
      now: Date.now(),
    }
    const available = !!ctx.llm.find?.(selection.model)
    const transition = decide({ available, caps: capsOf(selection.model), selection, cwd: session.cwd, history }, candidate)
    if (transition.type === 'reject') throw new Error(transition.reason)
    if (transition.type !== 'handoff') return { thread: target ?? (await create(session, selection)), transition }
    if (transition.strategy === 'delta' && target) return { thread: await handOver(step, target, 'delta'), transition }
    if (target) retire(target.id)
    return { thread: await handOver(step, await create(session, selection), 'full'), transition }
  }

  return {
    async prepare(session, turn, signal) {
      const path = currentPath(ctx, session)
      const { thread, transition } = await choose({ session, turn, path, current: currentOf(promptOf(path, turn.prompt)) })
      const build = () => buildRequest(ctx, stores.handoffs, session, thread, turn.selection)
      let built = await build()
      if (await ctx.bail(stepPrepare, built.request, session, signal)) built = await build()
      stores.threads.activate(thread.id, turn.selection)
      return { ...built, thread, transition, ...(built.request.handoff && { handoff: built.request.handoff.id }) }
    },
    settle(plan, { reply, usage, native, delivered }) {
      stores.threads.settle(plan.thread.id, { seen: extended(plan.seen, reply), context: contextOf(usage), ...(native && { native }) })
      if (plan.handoff) stores.handoffs.deliver(plan.handoff, delivered ?? 'inline')
    },
    lost(plan, error) {
      if (!(error instanceof ThreadLost)) {
        stores.threads.doubt(plan.thread.id)
        return false
      }
      if (capsOf(plan.thread.model).native) retire(plan.thread.id)
      return true
    },
    abandon: thread => stores.threads.doubt(thread),
    active: session => stores.threads.open(session.id)[0],
    async view(session) {
      const thread = stores.threads.open(session.id)[0]
      return thread && (await buildRequest(ctx, stores.handoffs, session, thread, thread)).request
    },
  }
}
