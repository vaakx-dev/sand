import { sourceBilling, type Effort, type LLM, matchModel, modelSource, type ModelInfo } from '@sand/accounts/contract'
import type { SessionSettings } from '@sand/model/contract'
import type { AgentRequest } from './contract'

export const parseEffort = (value: unknown, efforts: Effort[]) => {
  if (value === undefined || value === null) return undefined
  if (efforts.length && !efforts.includes(value as Effort)) throw new Error(`effort must be one of ${efforts.join(', ')}`)
  return String(value) as Effort
}

const resolveModel = (query: string | undefined, models: ModelInfo[], llm: LLM | undefined, caller: string | undefined) => {
  if (!query || !models.length) return query
  const own = caller ? (llm?.find?.(caller) ?? models.find(model => model.id === caller)) : undefined
  return matchModel(query, models, { find: llm?.find, prefer: own && modelSource(own), billing: sourceBilling(llm) })
}

const supportedEffort = (effort: Effort | undefined, model: ModelInfo | undefined) => (effort && model && !model.efforts.includes(effort) ? undefined : effort)

export const childSettings = (request: AgentRequest, preset: SessionSettings, inherited: SessionSettings | undefined, llm: LLM | undefined): SessionSettings | undefined => {
  const models = llm?.models?.() ?? []
  const model = resolveModel(request.model ?? preset.model, models, llm, inherited?.model) ?? inherited?.model
  const effort = supportedEffort(
    request.effort ?? preset.effort ?? inherited?.effort,
    models.find(candidate => candidate.id === model),
  )
  const speed = preset.speed ?? inherited?.speed
  const settings: SessionSettings = { ...(model && { model }), ...(effort && { effort }), ...(speed && { speed }) }
  return Object.keys(settings).length ? settings : undefined
}
