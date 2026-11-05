import type { CliFlags } from '@sand/config/contract'
import type { SessionSettings } from './contract'
import { type LLM, matchModel } from '@sand/accounts/contract'
import { asEffort, effortIds } from './effective'

export const flagSettings = ({ model, effort, fast }: CliFlags, llm?: LLM): SessionSettings | undefined => {
  if (!model && !effort && fast === undefined) return undefined
  const level = effort && asEffort(llm, effort)
  if (effort && !level) throw new Error(`--effort must be one of ${effortIds(llm).join(', ')}`)
  return {
    ...(model && { model: matchModel(model, llm?.models?.() ?? [], llm?.find) }),
    ...(level && { effort: level }),
    ...(fast !== undefined && { speed: fast ? 'fast' : 'normal' }),
  }
}
