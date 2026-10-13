import type { Effort, LLM, ModelInfo } from '@sand/llm-accounts/contract'
import type { SessionSettings } from '@sand/model/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { AgentRequest } from './contract'
import { matchModel } from '@sand/kit'

export const parseEffort = (value: unknown, efforts: Effort[]) => {
  if (value === undefined || value === null) return undefined
  if (efforts.length && !efforts.includes(value as Effort)) throw new Error(`effort must be one of ${efforts.join(', ')}`)
  return String(value) as Effort
}

const resolveModel = (query: string | undefined, models: ModelInfo[], llm: LLM | undefined) => {
  if (!query || !models.length) return query
  return matchModel(query, models, llm?.find)
}

const supportedEffort = (effort: Effort | undefined, model: ModelInfo | undefined) =>
  effort && model && !model.efforts.includes(effort) ? undefined : effort

export const parentSettings = (parent: Session) => parent.path().findLast(entry => entry.type === 'settings')?.data as SessionSettings | undefined

export const childSettings = (
  request: AgentRequest,
  preset: SessionSettings,
  inherited: SessionSettings | undefined,
  llm: LLM | undefined,
): SessionSettings | undefined => {
  const models = llm?.models?.() ?? []
  const model = resolveModel(request.model ?? preset.model, models, llm) ?? inherited?.model
  const effort = supportedEffort(
    request.effort ?? preset.effort ?? inherited?.effort,
    models.find(candidate => candidate.id === model),
  )
  const speed = preset.speed ?? inherited?.speed
  const settings: SessionSettings = { ...(model && { model }), ...(effort && { effort }), ...(speed && { speed }) }
  return Object.keys(settings).length ? settings : undefined
}
