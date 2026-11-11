import type { LLM, LLMRequest } from '@sand/accounts/contract'
import type { ContextUsage } from './contract'
import type { CompactionConfig } from './config'
import { partsOf } from './measure/parts'

const fallbackWindow = 200_000

export interface Budget {
  window: number
  start: number
  limit: number
  keep: number
}

export const budgetOf = (llm: LLM, config: CompactionConfig, model?: string): Budget => {
  const window = llm.models?.().find(info => info.id === model)?.context ?? fallbackWindow
  const reserve = Math.min(config.reserve, Math.floor(window / 2))
  const limit = Math.min(Math.floor(window * config.ratio), window - reserve, config.max_context ?? Infinity)
  const quarter = Math.floor(limit / 4)
  return { window, start: limit - Math.min(config.background, quarter), limit, keep: Math.min(config.keep, quarter) }
}

export const usageOf = ({ window, limit }: Budget, request: LLMRequest, used: number, compacting = false): ContextUsage => ({
  used,
  limit,
  window,
  ...(compacting && { compacting }),
  parts: partsOf(request, used),
})
