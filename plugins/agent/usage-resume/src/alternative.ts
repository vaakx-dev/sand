import { type LLM, type ModelInfo, outOfUsage, type SourceInfo } from '@sand/accounts/contract'
import type { Alternative } from './contract'

const accountName = ({ label, via }: SourceInfo) => (via ? `${label} on ${via}` : label)

const offerOf = (llm: LLM, chosen: ModelInfo | undefined): Alternative | undefined => {
  const source = chosen && llm.sources?.().find(found => found.id === chosen.source)
  return chosen && source ? { model: chosen.id, label: chosen.label, account: accountName(source) } : undefined
}

const open = (llm: LLM, model: ModelInfo) => {
  const out = outOfUsage(llm)
  const members = llm.members?.(model.id) ?? []
  return members.length ? members.some(member => !out.has(member.source ?? '')) : !out.has(model.source ?? '')
}

export const alternativeOf = (llm: LLM, model: string): Alternative | undefined => {
  const current = llm.find?.(model)
  if (!current) return undefined
  const online = new Set((llm.sources?.() ?? []).filter(source => source.online !== false).map(source => source.id))
  const models = (llm.models?.() ?? []).filter(found => found.source !== current.source && online.has(found.source ?? '') && open(llm, found))
  return offerOf(llm, models.find(found => found.name === current.name) ?? models[0])
}
