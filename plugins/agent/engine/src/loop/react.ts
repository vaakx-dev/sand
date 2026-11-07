import { callsOf, type Message, refused, skip, type StopReason, truncated } from '@sand/chats/contract'
import type { Resumption, Turn, TurnOutcome } from './turn'

const answerCalls = async (turn: Turn, message: Message, stopReason: StopReason) => {
  const pending = callsOf(message)
  if (!pending.length) return stopReason === 'pause_turn' || turn.hooks.steer()
  if (stopReason === 'refusal') turn.hooks.answer(skip(pending, refused))
  else if (stopReason === 'max_tokens') turn.hooks.answer(skip(pending, truncated))
  else await turn.hooks.tools(pending)
  await turn.hooks.steer()
  return stopReason !== 'refusal'
}

const step = async (turn: Turn, outcome: TurnOutcome) => {
  turn.signal.throwIfAborted()
  const { message, stopReason } = await turn.hooks.step()
  outcome.stopReason = stopReason
  return answerCalls(turn, message, stopReason)
}

const resume = async (turn: Turn, { calls, replied }: Resumption) => {
  if (calls.length) await turn.hooks.tools(calls)
  return (await turn.hooks.steer()) || !replied
}

export const runReact = async (turn: Turn, resumed?: Resumption): Promise<TurnOutcome> => {
  const outcome: TurnOutcome = { stopReason: 'end_turn' }
  let more = resumed ? await resume(turn, resumed) : true
  do {
    while (more) more = await step(turn, outcome)
    more = await turn.hooks.steer()
  } while (more)
  return outcome
}
