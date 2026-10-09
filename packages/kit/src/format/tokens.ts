import type { Usage } from '@sand/messages'

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 3 })

export const tokens = (value: number) => compact.format(value).replace('K', 'k')

export const tokensOf = (usage: Usage) => usage.input + usage.output + usage.cacheRead + usage.cacheWrite
