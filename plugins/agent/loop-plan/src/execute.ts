import type { Turn, TurnOutcome } from '@sand/loops/contract'
import type { Message, StopReason, ToolResultBlock } from '@sand/messages'
import { callsOf, refused, skip, textOf, truncated } from './calls'

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
    await answer(turn, skip(pending, refused))
    return false
  }
  await answer(turn, stopReason === 'max_tokens' ? skip(pending, truncated) : await turn.hooks.tools(pending))
  return true
}

const step = async (turn: Turn, outcome: TurnOutcome) => {
  turn.signal.throwIfAborted()
  const done = await turn.hooks.send()
  const message = await turn.hooks.respond(done.message)
  outcome.stopReason = done.stopReason
  outcome.text = textOf(message)
  return respond(turn, message, done.stopReason)
}

const proceed = async (turn: Turn, outcome: TurnOutcome) => {
  if (await appendInbox(turn)) return true
  if (await turn.hooks.stop(outcome)) return true
  return appendInbox(turn)
}

export const execute = async (turn: Turn, outcome: TurnOutcome) => {
  do {
    let more = true
    while (more) more = await step(turn, outcome)
  } while (await proceed(turn, outcome))
  return outcome
}
