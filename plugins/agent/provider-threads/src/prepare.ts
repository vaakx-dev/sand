import { statelessCaps, ThreadLost } from '@sand/accounts/contract'
import type { Message } from '@sand/chats/contract'
import { contextLimits } from '@sand/compaction/contract'
import type { Conversation, ConversationRef, Owner, StepDone, TurnInfo } from '@sand/engine/contract'
import type { Selection } from '@sand/model/contract'
import type { Dispose } from 'drydock'
import { adoption, contextOf } from './adopt'
import type { ThreadsContext } from './context'
import { type Brief, type HandoffStrategy, type ProviderThreadInfo, type ProviderThreads, stepPrepare } from './contract'
import { budgetOf, currentOf, fits, nativeOf, windowOf } from './handoff/budget'
import { handOff } from './handoff/deliver'
import { decide } from './policy'
import { currentPath, madeBy } from './current'
import { type Built, buildRequest } from './request'
import type { HandoffStore } from './store/handoffs'
import type { ThreadStore } from './store/threads'
import { compactedSince, extended, onPath } from './view/basis'
import { historyBefore, type Path } from './view/path'

export interface Stores {
  threads: ThreadStore
  handoffs: HandoffStore
}

interface Step {
  conversation: Conversation
  brief: Brief
  turn: TurnInfo
  path: Path
  current: number
}

interface Plan extends Built {
  thread: ProviderThreadInfo
  handoff?: string
}

const same = (thread: ProviderThreadInfo, { source, model }: Selection) => thread.source === source && thread.model === model

const promptOf = (path: Path, id: string) => (path.entries[path.index.get(id) ?? -1]?.data as Message | undefined)?.content ?? []

export const createThreads = (ctx: ThreadsContext, stores: Stores, cap: number): ProviderThreads => {
  const briefs = new Map<Owner, Brief>()
  const briefOf = ({ owner }: Conversation) => {
    const found = briefs.get(owner)
    if (!found) throw new Error(`Nothing briefs the models of ${owner} conversations`)
    return found
  }
  const capsOf = (model: string) => ctx.llm.caps?.(model) ?? statelessCaps()

  const retire = (thread: string) => {
    stores.threads.retire(thread)
    ctx.llm.release?.(thread)
  }

  const create = async ({ conversation, brief }: Step, selection: Selection) =>
    stores.threads.create({ conversation, selection, system: await brief.system(conversation, selection.model), seen: [], used: Date.now() })

  const rebrief = async ({ conversation, brief }: Step, thread: ProviderThreadInfo) => {
    const system = await brief.system(conversation, thread.model)
    stores.threads.rebrief(thread.id, system)
    return { ...thread, system }
  }

  const adopt = async ({ conversation, brief, path }: Step, target: Selection) => {
    const { system, ...found } = adoption(path, target)
    return stores.threads.create({ conversation, ...found, system: system ?? (await brief.system(conversation, found.selection.model)) })
  }

  const roomFor = (thread: ProviderThreadInfo, native: number, current: number) => ({
    cap,
    window: windowOf(ctx.llm.find?.(thread.model)?.context, ctx.get(contextLimits)?.limit(thread.model)),
    native,
    current,
  })

  const nativeFor = async ({ conversation, brief }: Step, thread: ProviderThreadInfo, strategy: HandoffStrategy) => {
    if (strategy === 'delta') return thread.context
    return nativeOf(thread.system, await brief.tools(conversation, []))
  }

  const handOver = async (step: Step, thread: ProviderThreadInfo, strategy: HandoffStrategy) => {
    const budget = budgetOf(roomFor(thread, await nativeFor(step, thread, strategy), step.current))
    const made = madeBy(ctx, step.path, step.conversation.owner)
    return ctx.ledger.tx(() => {
      const seen = handOff(stores.handoffs, { ...step, thread, strategy, made, budget })
      if (!seen) return thread
      stores.threads.see(thread.id, seen)
      return { ...thread, seen }
    })
  }

  const choose = async (step: Step): Promise<ProviderThreadInfo> => {
    const { conversation, turn, path } = step
    const { selection } = turn
    const history = historyBefore(path, turn.prompt)
    const open = stores.threads.open(conversation)
    const threads = open.length || !history || stores.threads.known(conversation) ? open : [await adopt(step, selection)]
    const target = threads.find(thread => same(thread, selection))
    const compacted = !!target && compactedSince(target.id, target.seen, path)
    const candidate = target && {
      thread: target,
      last: target === threads[0],
      onPath: onPath(target.seen, path),
      compacted,
      fits: fits(roomFor(target, target.context, step.current)),
      now: Date.now(),
    }
    const available = !!ctx.llm.find?.(selection.model)
    const transition = decide({ available, caps: capsOf(selection.model), selection, cwd: conversation.cwd, history }, candidate)
    if (transition.type === 'reject') throw new Error(transition.reason)
    if (transition.type !== 'handoff') {
      if (!target) return create(step, selection)
      return compacted ? rebrief(step, target) : target
    }
    if (transition.strategy === 'delta' && target) return handOver(step, target, 'delta')
    if (target) retire(target.id)
    return handOver(step, await create(step, selection), 'full')
  }

  const prepare = async (conversation: Conversation, turn: TurnInfo, signal: AbortSignal): Promise<Plan> => {
    const brief = briefOf(conversation)
    const path = currentPath(ctx, conversation)
    const step = { conversation, brief, turn, path, current: currentOf(promptOf(path, turn.prompt)) }
    let thread = await choose(step)
    const build = () => buildRequest(ctx, stores.handoffs, brief, conversation, thread, turn.selection)
    let built = await build()
    if (await ctx.bail(stepPrepare, built.request, conversation, turn, signal)) {
      thread = await rebrief(step, thread)
      built = await build()
    }
    stores.threads.activate(thread.id, turn.selection)
    return { ...built, thread, ...(built.request.handoff && { handoff: built.request.handoff.id }) }
  }

  const settle = (plan: Plan, { reply, usage, native, delivered }: StepDone) => {
    stores.threads.settle(plan.thread.id, { seen: extended(plan.seen, reply), context: contextOf(usage), ...(native && { native }) })
    if (plan.handoff) stores.handoffs.deliver(plan.handoff, delivered ?? 'inline')
  }

  const lost = (plan: Plan, error: unknown) => {
    if (!(error instanceof ThreadLost)) {
      stores.threads.doubt(plan.thread.id)
      return false
    }
    if (capsOf(plan.thread.model).native) retire(plan.thread.id)
    return true
  }

  const release = (conversation: ConversationRef) =>
    stores.threads.open(conversation).forEach(thread => ctx.llm.release?.(thread.id))

  return {
    brief(owner, brief): Dispose {
      if (briefs.has(owner)) throw new Error(`${owner} conversations are already briefed`)
      briefs.set(owner, brief)
      return () => void briefs.delete(owner)
    },
    async step(conversation, turn, signal) {
      const plan = await prepare(conversation, turn, signal)
      return { request: plan.request, thread: plan.thread.id, settle: done => settle(plan, done), lost: error => lost(plan, error) }
    },
    abandon: thread => stores.threads.doubt(thread),
    active: conversation => stores.threads.open(conversation)[0],
    async view(conversation) {
      const thread = stores.threads.open(conversation)[0]
      return thread && (await buildRequest(ctx, stores.handoffs, briefOf(conversation), conversation, thread, thread)).request
    },
    release,
    forget(conversation) {
      release(conversation)
      stores.threads.remove(conversation)
      stores.handoffs.remove(conversation)
    },
  }
}
