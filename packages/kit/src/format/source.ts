import type { LLM, SourceRef } from '@sand/llm-accounts/contract'
import type { UsageRecord } from '@sand/loops/contract'

type Tags = Omit<UsageRecord, 'id' | 'model' | 'usage'>

const fromRef = ({ source, label, provider, billing, plan, pc, pcName }: SourceRef): Tags => ({
  source,
  account: label,
  provider,
  billing,
  ...(plan && { plan }),
  ...(pc && { pc }),
  ...(pcName && { pcName }),
})

export const usageSource = (llm: LLM | undefined, model?: string, source?: SourceRef): Tags => {
  if (source) return fromRef(source)
  const provider = llm?.provider?.(model)
  return provider ? { provider: provider.id, billing: provider.billing } : {}
}

export const accountKey = ({ source, pc }: { source: string; pc?: string }) => (pc ? `${source}|${pc}` : source)
