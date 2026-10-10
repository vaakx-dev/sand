import type { SourceInfo } from '@sand/llm-accounts/contract'
import { icon, providerIcon } from '@sand/dom'

export const logo = (provider: string | undefined, size = 16) => providerIcon(provider, size) ?? icon('sparkles', size)

export const sourceName = (source: SourceInfo) => (source.via ? `${source.label} on ${source.via}` : source.label)
