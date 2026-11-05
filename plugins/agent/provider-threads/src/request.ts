import type { LLMRequest, ThreadRef } from '@sand/accounts/contract'
import type { Entry, Session } from '@sand/chats/contract'
import type { Selection } from '@sand/model/contract'
import { type ProviderThreadInfo, type Segment, stepTools, turns } from '@sand/turns-contract/contract'
import type { ThreadsContext } from './context'
import { covered, headOf, threadBasis } from './view/basis'
import { pathOf } from './view/path'
import { renderView, type TurnSource } from './view/render'

export interface Built {
  request: LLMRequest & { model: string }
  seen: Segment[]
}

const refOf = (thread: ProviderThreadInfo): ThreadRef => ({
  id: thread.id,
  generation: thread.generation,
  fresh: !thread.seen.length,
  seenHead: headOf(thread.seen),
  ...(thread.native && { native: thread.native }),
})

const lookupOf = (session: Session) => {
  let all: Map<string, Entry> | undefined
  return (id: string) => (all ??= new Map(session.entries().map(entry => [entry.id, entry]))).get(id)
}

const turnSourceOf = (ctx: ThreadsContext): TurnSource => {
  const found = new Map<string, string | undefined>()
  return turn => {
    if (!found.has(turn)) found.set(turn, ctx.get(turns)?.get(turn)?.selection.source)
    return found.get(turn)
  }
}

export const currentPath = (ctx: ThreadsContext, session: Session) => pathOf(session.path(), ctx.entryViews)

export const buildRequest = async (ctx: ThreadsContext, session: Session, thread: ProviderThreadInfo, { effort, speed }: Selection): Promise<Built> => {
  const path = currentPath(ctx, session)
  const basis = threadBasis(thread.id, thread.seen, path, lookupOf(session))
  const { messages, delta } = renderView(basis, path, thread.source, turnSourceOf(ctx))
  const tools = await ctx.waterfall(stepTools, ctx.context.tools(session, messages), session)
  return {
    request: {
      system: thread.system,
      messages,
      tools,
      model: thread.model,
      ...(effort && { effort }),
      speed,
      session: session.id,
      sessionKind: session.kind,
      thread: refOf(thread),
      delta,
    },
    seen: covered(basis, path),
  }
}
