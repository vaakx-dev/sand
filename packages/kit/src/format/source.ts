import type { ProviderInfo, SourceRef, UsageRecord } from '@sand/protocol'

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

export const usageSource = (provider: ProviderInfo | undefined, source?: SourceRef): Tags => {
  if (source) return fromRef(source)
  return provider ? { provider: provider.id, billing: provider.billing } : {}
}

export const accountKey = ({ source, pc }: { source: string; pc?: string }) => (pc ? `${source}|${pc}` : source)
