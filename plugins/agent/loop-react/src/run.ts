import type { Turn, TurnOutcome } from '@sand/loops/contract'
import { appendInbox, step } from './step'

const proceed = async (turn: Turn, outcome: TurnOutcome) => {
  if (await appendInbox(turn)) return true
  if (await turn.hooks.stop(outcome)) return true
  return appendInbox(turn)
}

export const runReact = async (turn: Turn): Promise<TurnOutcome> => {
  const outcome: TurnOutcome = { stopReason: 'end_turn', text: '' }
  do {
    let more = true
    while (more) more = await step(turn, outcome)
  } while (await proceed(turn, outcome))
  return outcome
}
