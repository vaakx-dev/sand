import type { ModelChoice } from '@sand/bots/contract'
import type { SettingsPatch } from '@sand/model/contract'

const field = <T>(current: T | undefined, next: T | null | undefined) => (next === undefined ? current : (next ?? undefined))

export const effective = (choice: ModelChoice, defaults: ModelChoice): ModelChoice => {
  const model = choice.model ?? defaults.model
  const effort = choice.effort ?? defaults.effort
  return { ...(model && { model }), ...(effort && { effort }) }
}

export const applyChoice = (choice: ModelChoice, patch: SettingsPatch): ModelChoice => {
  const model = field(choice.model, patch.model)
  const effort = field(choice.effort, patch.effort)
  return { ...(model && { model }), ...(effort && { effort }) }
}
