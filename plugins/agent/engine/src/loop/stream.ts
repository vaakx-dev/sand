import type { LLMEvent, LLMRequest } from '@sand/accounts/contract'
import { conceal, concealBlock, type Secrets } from '@sand/tools/contract'
import { untilAborted } from '@sand/util'
import type { Conversation, Conversations } from '../contract'
import type { EngineContext } from '../context'
import type { TurnRun } from './turn'

const visibleEvents = (secrets: Secrets) => {
  const hidden = new Set<number>()
  return (event: LLMEvent): LLMEvent | undefined => {
    switch (event.type) {
      case 'start':
        hidden.clear()
        return event
      case 'tool_call':
        if (secrets.has(event.name)) hidden.add(event.index)
        return event
      case 'tool_input':
        return hidden.has(event.index) ? undefined : event
      case 'block':
        return { ...event, block: concealBlock(event.block, secrets) }
      case 'done':
        return { ...event, message: conceal(event.message, secrets) }
      default:
        return event
    }
  }
}

export const streamStep = async <C extends Conversation>(
  ctx: EngineContext,
  conversations: Conversations<C>,
  request: LLMRequest,
  { conversation, signal, partial }: TurnRun<C>,
) => {
  signal.throwIfAborted()
  const events = ctx.llm.stream(request, signal)[Symbol.asyncIterator]()
  const visible = visibleEvents(ctx.tools.secrets())
  try {
    for (let next = await untilAborted(events.next(), signal); !next.done; next = await untilAborted(events.next(), signal)) {
      const event = next.value
      partial.observe(event)
      const shown = visible(event)
      if (shown) conversations.streamed?.(shown, conversation)
      if (event.type === 'done') return event
    }
  } finally {
    void events.return?.(undefined)?.catch(() => {})
  }
  throw new Error('Model stream ended without a final message')
}
