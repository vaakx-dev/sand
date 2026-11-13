import type { LLM, ModelInfo, SourceInfo } from '@sand/accounts/contract'
import type { Alternative } from './contract'

const outOfUsage = (llm: LLM) => new Set((llm.sourceLimits?.() ?? []).filter(limits => !limits.pc && limits.windows.some(window => window.used >= 1)).map(limits => limits.source))

const accountName = ({ label, via }: SourceInfo) => (via ? `${label} on ${via}` : label)

const usable = (llm: LLM, current: ModelInfo) => {
  const out = outOfUsage(llm)
  const sources = new Map((llm.sources?.() ?? []).filter(source => source.online !== false && source.id !== current.source && !out.has(source.id)).map(source => [source.id, source]))
  return { sources, models: (llm.models?.() ?? []).filter(model => !model.hidden && model.source && sources.has(model.source)) }
}

export const alternativeOf = (llm: LLM, model: string): Alternative | undefined => {
  const current = llm.find?.(model)
  if (!current) return undefined
  const { sources, models } = usable(llm, current)
  const chosen = models.find(found => found.name === current.name) ?? models[0]
  const source = chosen?.source ? sources.get(chosen.source) : undefined
  return chosen && source ? { model: chosen.id, label: chosen.label, account: accountName(source) } : undefined
}
