import type { LLMRequest } from '@sand/protocol'
import { untilAborted } from '@sand/kit'
import type { Done, TurnRun } from './types'

export const stream = async ({ ctx, session, signal, partial }: TurnRun, request: LLMRequest): Promise<Done> => {
  const events = ctx.llm.stream(request, signal)[Symbol.asyncIterator]()
  try {
    for (let next = await untilAborted(events.next(), signal); !next.done; next = await untilAborted(events.next(), signal)) {
      const event = next.value
      partial.observe(event)
      ctx.emit('llm.event', event, session)
      if (event.type === 'done') return event
    }
  } finally {
    void events.return?.(undefined)?.catch(() => {})
  }
  throw new Error('Model stream ended without a final message')
}
