import { llmEvent, type LLMRequest } from '@sand/accounts/contract'
import { untilAborted } from '@sand/util'
import type { TurnsContext } from '../context'
import type { TurnRun } from './turn'

export const streamStep = async (ctx: TurnsContext, request: LLMRequest, { session, signal, partial }: TurnRun) => {
  signal.throwIfAborted()
  const events = ctx.llm.stream(request, signal)[Symbol.asyncIterator]()
  try {
    for (let next = await untilAborted(events.next(), signal); !next.done; next = await untilAborted(events.next(), signal)) {
      const event = next.value
      partial.observe(event)
      ctx.emit(llmEvent, event, session)
      if (event.type === 'done') return event
    }
  } finally {
    void events.return?.(undefined)?.catch(() => {})
  }
  throw new Error('Model stream ended without a final message')
}
