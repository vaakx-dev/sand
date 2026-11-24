import type { LLMRequest } from '@sand/accounts/contract'
import { budgetOf, windowOf } from '../budget'
import type { CompactionConfig } from '../config'
import type { ContextUsage, SystemPart, SystemParts } from '../contract'
import { partsOf } from './parts'

export const createMeter = (config: CompactionConfig) => {
  const carved = new Set<SystemPart>()
  const budget = (request: LLMRequest) => budgetOf(config, windowOf(request))

  const parts: SystemParts = {
    add(part) {
      carved.add(part)
      return () => void carved.delete(part)
    },
  }

  const usage = (request: LLMRequest, used: number): ContextUsage => {
    const { window, bounds } = budget(request)
    return { used, ...(bounds && { limit: bounds.limit }), ...(window && { window }), parts: partsOf(request, used, [...carved]) }
  }

  return { budget, parts, usage }
}

export type Meter = ReturnType<typeof createMeter>
