import { drainOrder, type LLM, type ModelInfo, outOfUsage, planSiblings, type SourceInfo } from '@sand/accounts/contract'
import type { Alternative } from './contract'

const accountName = ({ label, via }: SourceInfo) => (via ? `${label} on ${via}` : label)

const offerOf = (llm: LLM, chosen: ModelInfo | undefined): Alternative | undefined => {
  const source = chosen && llm.sources?.().find(found => found.id === chosen.source)
  return chosen && source ? { model: chosen.id, label: chosen.label, account: accountName(source) } : undefined
}

const usable = (llm: LLM, current: ModelInfo) => {
  const out = outOfUsage(llm)
  const sources = new Set((llm.sources?.() ?? []).filter(source => source.online !== false && source.id !== current.source && !out.has(source.id)).map(source => source.id))
  return (llm.models?.() ?? []).filter(model => !model.hidden && model.source && sources.has(model.source))
}

export const alternativeOf = (llm: LLM, model: string): Alternative | undefined => {
  const current = llm.find?.(model)
  if (!current) return undefined
  const models = usable(llm, current)
  return offerOf(llm, models.find(found => found.name === current.name) ?? models[0])
}

export const carryOnOf = (llm: LLM, model: string): Alternative | undefined => {
  const current = llm.find?.(model)
  if (!current) return undefined
  const others = planSiblings(llm, current).filter(found => found.source !== current.source)
  return offerOf(llm, drainOrder(llm, others)[0])
}
