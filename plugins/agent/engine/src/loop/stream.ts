import type { LLMRequest } from '@sand/accounts/contract'
import { untilAborted } from '@sand/util'
import type { Conversation, Conversations } from '../contract'
import type { EngineContext } from '../context'
import type { TurnRun } from './turn'

export const streamStep = async <C extends Conversation>(
  ctx: EngineContext,
  conversations: Conversations<C>,
  request: LLMRequest,
  { conversation, signal, partial }: TurnRun<C>,
) => {
  signal.throwIfAborted()
  const events = ctx.llm.stream(request, signal)[Symbol.asyncIterator]()
  try {
    for (let next = await untilAborted(events.next(), signal); !next.done; next = await untilAborted(events.next(), signal)) {
      const event = next.value
      partial.observe(event)
      conversations.streamed?.(event, conversation)
      if (event.type === 'done') return event
    }
  } finally {
    void events.return?.(undefined)?.catch(() => {})
  }
  throw new Error('Model stream ended without a final message')
}
