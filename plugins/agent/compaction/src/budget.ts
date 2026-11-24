import type { LLMRequest } from '@sand/accounts/contract'
import type { CompactionConfig } from './config'

export interface Bounds {
  start: number
  limit: number
}

export interface Budget {
  window?: number
  keep: number
  bounds?: Bounds
}

export const windowOf = (request: LLMRequest) => request.thread?.window

export const limitOf = ({ ratio, reserve, max_context }: CompactionConfig, window: number) =>
  Math.min(Math.floor(window * ratio), window - Math.min(reserve, Math.floor(window / 2)), max_context ?? Infinity)

export const budgetOf = (config: CompactionConfig, window: number | undefined): Budget => {
  const limit = window ? limitOf(config, window) : config.max_context
  if (!limit) return { keep: config.keep }
  const quarter = Math.floor(limit / 4)
  return { ...(window && { window }), keep: Math.min(config.keep, quarter), bounds: { start: limit - Math.min(config.background, quarter), limit } }
}
