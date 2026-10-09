import type { ContextUsage, LLM } from '@sand/protocol'
import type { CompactionConfig } from './config'

const fallbackWindow = 200_000

export interface Budget {
  window: number
  limit: number
  keep: number
}

export const budgetOf = (llm: LLM, config: CompactionConfig, model?: string): Budget => {
  const window = llm.models?.().find(info => info.id === model)?.context ?? fallbackWindow
  const reserve = Math.min(config.reserve, Math.floor(window / 2))
  const limit = Math.min(Math.floor(window * config.ratio), window - reserve, config.max_context ?? Infinity)
  return { window, limit, keep: Math.min(config.keep, Math.floor(limit / 4)) }
}

export const usageOf = ({ window, limit }: Budget, used: number, compacting = false): ContextUsage => ({
  used,
  limit,
  window,
  ...(compacting && { compacting }),
})
