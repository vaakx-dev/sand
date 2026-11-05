import type { HandoffBlock, LLMRequest, ThreadRef } from '@sand/accounts/contract'
import type { Entry, Session } from '@sand/chats/contract'
import type { Selection } from '@sand/model/contract'
import { type ProviderThreadInfo, type Segment, stepTools } from '@sand/turns-contract/contract'
import type { ThreadsContext } from './context'
import type { HandoffStore } from './store/handoffs'
import { currentPath, madeBy } from './current'
import { readsHistory, threadReadName } from './tools/thread-read'
import { covered, headOf, threadBasis } from './view/basis'
import { renderView } from './view/render'

export interface Built {
  request: LLMRequest & { model: string }
  seen: Segment[]
}

const received = (seen: Segment[], handoff?: HandoffBlock) => (handoff ? seen.filter(segment => !('handoff' in segment && segment.handoff === handoff.id)) : seen)

const refOf = (thread: ProviderThreadInfo, cwd: string, handoff?: HandoffBlock): ThreadRef => {
  const seen = received(thread.seen, handoff)
  return {
    id: thread.id,
    generation: thread.generation,
    fresh: !seen.length,
    seenHead: headOf(seen),
    cwd,
    ...(thread.native && { native: thread.native }),
  }
}

const lookupOf = (session: Session) => {
  let all: Map<string, Entry> | undefined
  return (id: string) => (all ??= new Map(session.entries().map(entry => [entry.id, entry]))).get(id)
}

export const buildRequest = async (
  ctx: ThreadsContext,
  handoffs: HandoffStore,
  session: Session,
  thread: ProviderThreadInfo,
  { effort, speed }: Selection,
): Promise<Built> => {
  const path = currentPath(ctx, session)
  const basis = threadBasis(thread.id, thread.seen, path, lookupOf(session))
  const { messages, delta } = renderView(basis, path, { source: thread.source, made: madeBy(ctx, path), handoff: handoffs.text })
  const offered = await ctx.waterfall(stepTools, ctx.context.tools(session, messages), session)
  const tools = readsHistory(thread) ? offered : offered.filter(tool => tool.name !== threadReadName)
  const handoff = handoffs.pending(thread.id)
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
      thread: refOf(thread, session.cwd, handoff),
      delta,
      ...(handoff && { handoff }),
    },
    seen: covered(basis, path),
  }
}
