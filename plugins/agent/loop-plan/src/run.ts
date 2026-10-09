import type { Turn, TurnOutcome } from '@sand/loops/contract'
import type { ToolResultBlock } from '@sand/messages'
import { execute } from './execute'
import { plan, type PlanOptions } from './plan'

const handover = [
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
  turn.hooks.append({ role: 'user', content: [...pending, ...steers, { type: 'text', text: handover }] })
}

export const runPlan = (options: PlanOptions) => async (turn: Turn): Promise<TurnOutcome> => {
  const outcome: TurnOutcome = { stopReason: 'end_turn', text: '' }
  const pending = await plan(turn, outcome, options)
  if (!pending) return outcome
  await handOver(turn, pending)
  return execute(turn, outcome)
}
