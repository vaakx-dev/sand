import type { HandoffBlock, LLMRequest, ThreadRef } from '@sand/accounts/contract'
import type { Entry } from '@sand/chats/contract'
import type { Conversation } from '@sand/engine/contract'
import type { Selection } from '@sand/model/contract'
import type { ThreadsContext } from './context'
import type { Brief, ProviderThreadInfo, Segment } from './contract'
import type { HandoffStore } from './store/handoffs'
import { currentPath, madeBy } from './current'
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

const lookupOf = (conversation: Conversation) => {
  let all: Map<string, Entry> | undefined
  return (id: string) => (all ??= new Map(conversation.entries().map(entry => [entry.id, entry]))).get(id)
}

export const buildRequest = async (
  ctx: ThreadsContext,
  handoffs: HandoffStore,
  brief: Brief,
  conversation: Conversation,
  thread: ProviderThreadInfo,
  { effort, speed }: Selection,
): Promise<Built> => {
  const path = currentPath(ctx, conversation)
  const basis = threadBasis(thread.id, thread.seen, path, lookupOf(conversation))
  const { messages, delta } = renderView(basis, path, { source: thread.source, made: madeBy(ctx, path, conversation.owner), handoff: handoffs.text })
  const tools = await brief.tools(conversation, messages)
  const kind = brief.kind?.(conversation)
  const handoff = handoffs.pending(thread.id)
  return {
    request: {
      system: thread.system,
      messages,
      tools,
      model: thread.model,
      ...(effort && { effort }),
      speed,
      session: conversation.id,
      ...(kind && { sessionKind: kind }),
      thread: refOf(thread, conversation.cwd, handoff),
      delta,
      ...(handoff && { handoff }),
    },
    seen: covered(basis, path),
  }
}
