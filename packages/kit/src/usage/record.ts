import type { Usage } from '@sand/messages'
import type { ProviderInfo, SourceRef, UsageRecord } from '@sand/protocol'
import { usageSource } from './source'

export const usageRecord = (provider: ProviderInfo | undefined, model: string | undefined, usage: Usage, source?: SourceRef): UsageRecord => ({
  id: Bun.randomUUIDv7(),
  ...(model && { model }),
  ...usageSource(provider, source),
  usage,
})
