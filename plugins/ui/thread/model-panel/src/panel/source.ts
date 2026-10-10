import type { SourceInfo } from '@sand/llm-accounts/contract'
import { icon, providerIcon } from '@sand/dom'

export const logo = (provider: string | undefined, size = 16) => providerIcon(provider, size) ?? icon('sparkles', size)

export const sourceDetail = (source: SourceInfo) => {
  if (source.via) return `On ${source.via}`
  if (source.billing === 'plan') return source.plan ? `${source.plan} plan` : 'Subscription'
  if (source.billing === 'api') return 'Pay per token'
  if (source.billing === 'local') return 'This PC'
  return 'Credits'
}

export const sourceName = (source: SourceInfo) => (source.via ? `${source.label} on ${source.via}` : source.label)

export const sourceTitle = (source: SourceInfo, offline = false) =>
  source.via ? [sourceName(source), offline && 'offline'].filter(Boolean).join(' · ') : `${source.label} · ${sourceDetail(source)}`
