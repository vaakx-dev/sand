import type { ModelChoice, ToolDecision } from '@sand/loops/contract'
import type { ToolCallBlock } from '@sand/messages'
import type { HookName, HookOutcome } from '../contract'
import { hookSpecs } from './args'

export interface Outcome {
  outcome: HookOutcome
  detail?: string
}

const toolOutcomes: Record<ToolDecision['action'], HookOutcome> = {
  allow: 'allowed',
  deny: 'denied',
  ask: 'asked',
  rewrite: 'rewritten',
}

const toolOutcome = (decision: ToolDecision, call: ToolCallBlock): Outcome => ({
  outcome: toolOutcomes[decision.action] ?? 'decided',
  detail: decision.reason ? `${call.name}: ${decision.reason}` : call.name,
})

const choiceDetail = (choice: ModelChoice) =>
  [choice.model && `model ${choice.model}`, choice.effort && `effort ${choice.effort}`, choice.speed && `speed ${choice.speed}`]
    .filter(Boolean)
    .join(', ')

const decideDetail = (name: HookName, result: unknown) => {
  if (name === 'model.choose') return choiceDetail(result as ModelChoice)
  if (name === 'turn.stop') return 'continued the turn'
  if (name === 'context.overflow') return result ? 'handled the overflow' : 'let the overflow fail'
}

export const outcomeOf = (name: HookName, args: unknown[], result: unknown): Outcome | undefined => {
  if (result === undefined) return
  const { kind } = hookSpecs[name]
  if (kind === 'change') return result === args[0] ? undefined : { outcome: 'changed' }
  if (kind !== 'decide') return
  if (name === 'tool.before') return toolOutcome(result as ToolDecision, args[0] as ToolCallBlock)
  return { outcome: 'decided', detail: decideDetail(name, result) || undefined }
}
