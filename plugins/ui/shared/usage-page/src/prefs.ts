import type { UsageRange } from '@sand/usage/contract'
import { stored } from '@vaakx-dev/vrui'
import type { Metric } from './format'

export const allPcs = ''

export const pageRanges = ['7d', '30d', '90d', 'month'] as const satisfies UsageRange[]

export type PageRange = (typeof pageRanges)[number]

const metrics: Metric[] = ['cost', 'tokens']

export const usagePrefs = () => ({
  range: stored<PageRange>('sand.usage.range', '30d', value => pageRanges.some(range => range === value)),
  pc: stored<string>('sand.usage.pc', allPcs),
  metric: stored<Metric>('sand.usage.metric', 'cost', value => metrics.some(metric => metric === value)),
})
