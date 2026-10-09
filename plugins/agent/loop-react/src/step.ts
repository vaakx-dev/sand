import type { Turn, TurnOutcome } from '@sand/loops/contract'
import type { Message, StopReason, ToolResultBlock } from '@sand/messages'
import { callsOf, skip } from './calls'

const textOf = (message: Message) =>
  message.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('\n')

export const appendInbox = async ({ hooks }: Turn) => {
  const steering = await hooks.inbox()
  if (!steering.length) return false
  hooks.append({ role: 'user', content: steering })
  return true
}

const answer = async ({ hooks }: Turn, results: ToolResultBlock[]) => {
  hooks.append({ role: 'user', content: [...results, ...(await hooks.inbox())] })
}

const respond = async (turn: Turn, message: Message, stopReason: StopReason) => {
  const pending = callsOf(message)
  if (!pending.length) return stopReason === 'pause_turn' || appendInbox(turn)
  if (stopReason === 'refusal') {
    await answer(turn, skip(pending, 'Not run: the response was refused.'))
    return false
  }
  const results =
    stopReason === 'max_tokens'
      ? skip(pending, 'Not run: the response hit max_tokens before this call was complete. Retry with a smaller input.')
      : await turn.hooks.tools(pending)
  await answer(turn, results)
  return true
}

export const step = async (turn: Turn, outcome: TurnOutcome) => {
  turn.signal.throwIfAborted()
  const done = await turn.hooks.send()
  const message = await turn.hooks.respond(done.message)
  outcome.stopReason = done.stopReason
  outcome.text = textOf(message)
  return respond(turn, message, done.stopReason)
}
