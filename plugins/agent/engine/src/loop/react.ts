import { callsOf, type Message, refused, skip, type StopReason, type ToolCallBlock, truncated } from '@sand/chats/contract'
import type { Turn, TurnOutcome } from './turn'

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

export const runReact = async (turn: Turn, resumed: ToolCallBlock[]): Promise<TurnOutcome> => {
  const outcome: TurnOutcome = { stopReason: 'end_turn' }
  if (resumed.length) {
    await turn.hooks.tools(resumed)
    await turn.hooks.steer()
  }
  do {
    let more = true
    while (more) more = await step(turn, outcome)
  } while (await turn.hooks.steer())
  return outcome
}
