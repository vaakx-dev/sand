import type { UsageRange } from '@sand/usage/contract'
import { stored } from '@vaakx-dev/vrui'

export const allPcs = ''

export const pageRanges = ['7d', '30d', '90d'] as const satisfies UsageRange[]

export type PageRange = (typeof pageRanges)[number]

export const usagePrefs = () => ({
  range: stored<PageRange>('sand.usage.range', '30d', value => pageRanges.some(range => range === value)),
  pc: stored<string>('sand.usage.pc', allPcs),
  forecast: stored<string>('sand.usage.forecast', ''),
})
