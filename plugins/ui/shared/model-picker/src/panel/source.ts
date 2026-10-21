import type { SourceInfo } from '@sand/accounts/contract'
import { sourceName } from '../models'

export const sourceDetail = (source: SourceInfo) => {
  if (source.via) return `On ${source.via}`
  if (source.billing === 'plan') return source.plan ? `${source.plan} plan` : 'Subscription'
  if (source.billing === 'api') return 'Pay per token'
  if (source.billing === 'local') return 'This PC'
  return 'Credits'
}

export const sourceTitle = (source: SourceInfo, offline = false) =>
  source.via ? [sourceName(source), offline && 'offline'].filter(Boolean).join(' · ') : `${source.label} · ${sourceDetail(source)}`
