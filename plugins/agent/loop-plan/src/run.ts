import type { Loops, Turn, TurnOutcome } from '@sand/loops/contract'
import type { ToolResultBlock } from '@sand/messages'
import { plan, type PlanOptions } from './plan'

const carryOut = [
  '<task-notification>',
  '<job>plan</job>',
  '<label>Plan</label>',
  '<status>done</status>',
  '<result>',
  'Carry out the plan above.',
  '</result>',
  '</task-notification>',
].join('\n')

const handOver = async (turn: Turn, pending: ToolResultBlock[]) => {
  const steers = await turn.hooks.inbox()
  turn.hooks.append({ role: 'user', content: [...pending, ...steers, { type: 'text', text: carryOut }] })
}

export const runPlan = (loops: Loops, options: PlanOptions) => async (turn: Turn): Promise<TurnOutcome> => {
  const outcome: TurnOutcome = { stopReason: 'end_turn', text: '' }
  const pending = await plan(turn, outcome, options)
  if (!pending) return outcome
  await handOver(turn, pending)
  return loops.react(turn)
}
