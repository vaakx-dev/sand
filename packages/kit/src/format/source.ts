import type { LLM } from '@sand/llm-accounts/contract'
import type { UsageRecord } from '@sand/loops/contract'

export const usageSource = (llm: LLM | undefined, model?: string): Pick<UsageRecord, 'provider' | 'billing'> => {
  const provider = llm?.provider?.(model)
  return provider ? { provider: provider.id, billing: provider.billing } : {}
}
