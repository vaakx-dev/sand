import type { LLM, Limits } from '@sand/llm-accounts/contract'

export const limitsOf = (llm?: LLM): Limits[] => {
  const listed = llm?.sourceLimits?.()
  if (listed) return listed
  const single = llm?.limits?.()
  return single ? [single] : []
}
