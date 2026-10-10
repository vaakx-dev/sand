import type { LLM, LLMRequest } from '@sand/llm-accounts/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import { untilAborted } from '@sand/kit'
import type { LoopsContext } from '../context'
import type { StreamDone } from '../contract'
import { markExternal } from './fault'
import type { TurnState } from './state'
import { track } from './usage'

const read = async (ctx: LoopsContext, llm: LLM, request: LLMRequest, session: Session, signal: AbortSignal, state: TurnState) => {
  signal.throwIfAborted()
  const events = llm.stream(request, signal)[Symbol.asyncIterator]()
  try {
    for (let next = await untilAborted(events.next(), signal); !next.done; next = await untilAborted(events.next(), signal)) {
      const event = next.value
      state.partial.observe(event)
      ctx.emit('llm.event', event, session)
      if (event.type === 'done') return event
    }
  } finally {
    void events.return?.(undefined)?.catch(() => {})
  }
  throw new Error('Model stream ended without a final message')
}

export const streamReply = async (
  ctx: LoopsContext,
  llm: LLM,
  request: LLMRequest,
  session: Session,
  signal: AbortSignal,
  state: TurnState,
): Promise<StreamDone> => {
  state.model = request.model
  const done = await read(ctx, llm, request, session, signal, state).catch(error => {
    throw markExternal(error)
  })
  track(state, done.usage, request.model, done.source)
  state.stopReason = done.stopReason
  return { message: done.message, usage: done.usage, stopReason: done.stopReason }
}
