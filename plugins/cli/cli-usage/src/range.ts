import type { UsageRange } from '@sand/kit'

export const ranges = ['24h', '7d', '30d', '90d'] as const satisfies readonly UsageRange[]

export type Range = (typeof ranges)[number]

export const rangeTitle: Record<Range, string> = { '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days' }
