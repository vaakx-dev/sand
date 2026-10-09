import type { CliFlags } from '@sand/protocol'
import type { Effort, LLM } from '@sand/llm-accounts/contract'
import type { SessionSettings } from './contract'
import { matchModel } from '@sand/kit'

export const flagSettings = (flags: CliFlags = {}, llm?: LLM): SessionSettings | undefined => {
  const { model, effort, fast } = flags
  if (!model && !effort && fast === undefined) return undefined
  const efforts = llm?.levels?.().map(level => level.id) ?? []
  if (effort && !efforts.includes(effort as Effort)) throw new Error(`--effort must be one of ${efforts.join(', ')}`)
  return {
    ...(model && { model: matchModel(model, llm?.models?.() ?? []) }),
    ...(effort && { effort: effort as Effort }),
    ...(fast !== undefined && { speed: fast ? 'fast' : 'normal' }),
  }
}
