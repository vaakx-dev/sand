import { llmEvent, type LLMRequest } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { untilAborted } from '@sand/util'
import type { LoopsContext } from '../context'
import type { StreamDone } from '../turn'
import type { TurnState } from './state'
import { track } from './usage'

const read = async (ctx: LoopsContext, request: LLMRequest, session: Session, signal: AbortSignal, state: TurnState) => {
  signal.throwIfAborted()
  const events = ctx.llm.stream(request, signal)[Symbol.asyncIterator]()
  try {
    for (let next = await untilAborted(events.next(), signal); !next.done; next = await untilAborted(events.next(), signal)) {
      const event = next.value
      state.partial.observe(event)
      ctx.emit(llmEvent, event, session)
      if (event.type === 'done') return event
    }
  } finally {
    void events.return?.(undefined)?.catch(() => {})
  }
  throw new Error('Model stream ended without a final message')
}

export const streamReply = async (ctx: LoopsContext, request: LLMRequest, session: Session, signal: AbortSignal, state: TurnState): Promise<StreamDone> => {
  const done = await read(ctx, request, session, signal, state)
  track(state, done.usage, request.model, done.source)
  state.stopReason = done.stopReason
  return { message: done.message, stopReason: done.stopReason }
}
