import { statelessCaps, ThreadLost } from '@sand/accounts/contract'
import type { Message, Session } from '@sand/chats/contract'
import { contextLimits } from '@sand/compaction/contract'
import type { Selection } from '@sand/model/contract'
import { type ProviderThreadInfo, type ProviderThreads, stepPrepare, type Transition, type TurnInfo } from '@sand/turns-contract/contract'
import { adoption, contextOf } from './adopt'
import type { ThreadsContext } from './context'
import { currentOf, fits, windowOf } from './handoff/budget'
import { decide } from './policy'
import { buildRequest, currentPath } from './request'
import type { ThreadStore } from './store/threads'
import { covered, extended, fullBasis, onPath } from './view/basis'
import { historyBefore, type Path } from './view/path'

interface Chosen {
  thread: ProviderThreadInfo
  transition: Transition
}

const same = (thread: ProviderThreadInfo, { source, model }: Selection) => thread.source === source && thread.model === model

const promptOf = (path: Path, id: string) => (path.entries[path.index.get(id) ?? -1]?.data as Message | undefined)?.content ?? []

export const createThreads = (ctx: ThreadsContext, store: ThreadStore, cap: number): ProviderThreads => {
  const systemOf = (session: Session, model: string) => ctx.context.system(session, model)

  const adopt = async (session: Session, path: Path, target: Selection) => {
    const { system, ...found } = adoption(path, target)
    return store.create({ session: session.id, ...found, system: system ?? (await systemOf(session, found.selection.model)) })
  }

  const roomFor = (thread: ProviderThreadInfo, path: Path, turn: TurnInfo) => ({
    cap,
    window: windowOf(ctx.llm.find?.(thread.model)?.context, ctx.get(contextLimits)?.limit(thread.model)),
    native: thread.context,
    current: currentOf(promptOf(path, turn.prompt)),
  })

  const choose = async (session: Session, turn: TurnInfo, path: Path): Promise<Chosen> => {
    const { selection } = turn
    const history = historyBefore(path, turn.prompt)
    const open = store.open(session.id)
    const threads = open.length || !history ? open : [await adopt(session, path, selection)]
    const target = threads.find(thread => same(thread, selection))
    const candidate = target && {
      thread: target,
      last: target === threads[0],
      onPath: onPath(target.seen, path),
      fits: fits(roomFor(target, path, turn)),
      now: Date.now(),
    }
    const available = !!ctx.llm.find?.(selection.model)
    const caps = ctx.llm.caps?.(selection.model) ?? statelessCaps()
    const transition = decide({ available, caps, selection, cwd: session.cwd, history }, candidate)
    if (transition.type === 'reject') throw new Error(transition.reason)
    const full = transition.type === 'handoff' && transition.strategy === 'full'
    if (target && !full) return { thread: target, transition }
    if (target) store.retire(target.id)
    const seen = full ? covered(fullBasis(path), path) : []
    const thread = store.create({ session: session.id, selection, system: await systemOf(session, selection.model), seen, used: Date.now() })
    return { thread, transition }
  }

  return {
    async prepare(session, turn, signal) {
      const { thread, transition } = await choose(session, turn, currentPath(ctx, session))
      let built = await buildRequest(ctx, session, thread, turn.selection)
      if (await ctx.bail(stepPrepare, built.request, session, signal)) built = await buildRequest(ctx, session, thread, turn.selection)
      store.activate(thread.id, turn.selection)
      return { ...built, thread, transition }
    },
    settle(plan, { reply, usage, native }) {
      store.settle(plan.thread.id, { seen: extended(plan.seen, reply), context: contextOf(usage), ...(native && { native }) })
    },
    lost(plan, error) {
      if (!(error instanceof ThreadLost)) return false
      store.retire(plan.thread.id)
      return true
    },
    active: session => store.open(session.id)[0],
    async view(session) {
      const thread = store.open(session.id)[0]
      return thread && (await buildRequest(ctx, session, thread, thread)).request
    },
  }
}
