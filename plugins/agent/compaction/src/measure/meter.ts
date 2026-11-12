import type { LLM, LLMRequest } from '@sand/accounts/contract'
import { budgetOf } from '../budget'
import type { CompactionConfig } from '../config'
import type { ContextUsage, SystemPart, SystemParts } from '../contract'
import { partsOf } from './parts'

export const createMeter = (llm: LLM, config: CompactionConfig) => {
  const carved = new Set<SystemPart>()
  const budget = (request: LLMRequest) => budgetOf(llm, config, request.model)

  const parts: SystemParts = {
    add(part) {
      carved.add(part)
      return () => void carved.delete(part)
    },
  }

  const usage = (request: LLMRequest, used: number): ContextUsage => {
    const { window, limit } = budget(request)
    return { used, limit, window, parts: partsOf(request, used, [...carved]) }
  }

  return { budget, parts, usage }
}

export type Meter = ReturnType<typeof createMeter>
