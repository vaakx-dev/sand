import { callsOf, type Message, refused, skip, type StopReason, truncated } from '@sand/chats/contract'
import type { Turn, TurnOutcome } from './turn'

const appendInbox = async ({ hooks }: Turn) => {
  const steering = await hooks.inbox()
  if (!steering.length) return false
  hooks.append({ role: 'user', content: steering })
  return true
}

const answerCalls = async (turn: Turn, message: Message, stopReason: StopReason) => {
  const pending = callsOf(message)
  if (!pending.length) return stopReason === 'pause_turn' || appendInbox(turn)
  if (stopReason === 'refusal') turn.hooks.answer(skip(pending, refused))
  else if (stopReason === 'max_tokens') turn.hooks.answer(skip(pending, truncated))
  else await turn.hooks.tools(pending)
  await appendInbox(turn)
  return stopReason !== 'refusal'
}

const step = async (turn: Turn, outcome: TurnOutcome) => {
  turn.signal.throwIfAborted()
  const { message, stopReason } = await turn.hooks.step()
  outcome.stopReason = stopReason
  return answerCalls(turn, message, stopReason)
}

export const runReact = async (turn: Turn): Promise<TurnOutcome> => {
  const outcome: TurnOutcome = { stopReason: 'end_turn' }
  do {
    let more = true
    while (more) more = await step(turn, outcome)
  } while (await appendInbox(turn))
  return outcome
}
