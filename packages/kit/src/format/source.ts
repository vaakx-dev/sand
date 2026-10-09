import type { LLM, UsageRecord } from '@sand/protocol'

export const usageSource = (llm: LLM | undefined, model?: string): Pick<UsageRecord, 'provider' | 'billing'> => {
  const provider = llm?.provider?.(model)
  return provider ? { provider: provider.id, billing: provider.billing } : {}
}
