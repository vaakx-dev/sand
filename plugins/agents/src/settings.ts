import type { AgentDefinition, AgentRequest, Effort, LLM, ModelInfo, SessionSettings } from '@sand/protocol'
import { matchModel } from '@sand/kit'

export const parseEffort = (value: unknown, efforts: Effort[]) => {
  if (value === undefined || value === null) return undefined
  if (efforts.length && !efforts.includes(value as Effort)) throw new Error(`effort must be one of ${efforts.join(', ')}`)
  return String(value) as Effort
}

const resolveModel = (query: string | undefined, models: ModelInfo[]) => {
  if (!query || !models.length) return query
  return matchModel(query, models)
}

const supportedEffort = (effort: Effort | undefined, model: ModelInfo | undefined) =>
  effort && model && !model.efforts.includes(effort) ? undefined : effort

export const childSettings = (
  request: AgentRequest,
  definition: AgentDefinition,
  llm: LLM | undefined,
): SessionSettings | undefined => {
  const inherited = request.parent.path().findLast(entry => entry.type === 'settings')?.data as SessionSettings | undefined
  const models = llm?.models?.() ?? []
  const model = resolveModel(request.model ?? definition.model, models) ?? inherited?.model
  const effort = supportedEffort(
    request.effort ?? definition.effort ?? inherited?.effort,
    models.find(candidate => candidate.id === model),
  )
  const { model: _, effort: __, ...rest } = inherited ?? {}
  const settings: SessionSettings = { ...rest, ...(model && { model }), ...(effort && { effort }) }
  return Object.keys(settings).length ? settings : undefined
}
