import type { ProviderInfo, SourceRef, Usage, UsageRecord } from '@sand/accounts/contract'
import { usageSource } from './source'

export const usageRecord = (provider: ProviderInfo | undefined, model: string | undefined, usage: Usage, source?: SourceRef): UsageRecord => ({
  id: Bun.randomUUIDv7(),
  ...(model && { model }),
  ...usageSource(provider, source),
  usage,
})
