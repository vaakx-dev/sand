import { type UsageRange, usageOrigins } from '@sand/usage/contract'
import { stored } from '@vaakx-dev/vrui'

export const allPcs = ''

export const pageRanges = ['7d', '30d', '90d'] as const satisfies UsageRange[]

export type PageRange = (typeof pageRanges)[number]

export const pageOrigins = ['all', ...usageOrigins] as const

export type PageOrigin = (typeof pageOrigins)[number]

export const usagePrefs = () => ({
  range: stored<PageRange>('sand.usage.range', '30d', value => pageRanges.some(range => range === value)),
  origin: stored<PageOrigin>('sand.usage.origin', 'all', value => pageOrigins.some(origin => origin === value)),
  pc: stored<string>('sand.usage.pc', allPcs),
  forecast: stored<string>('sand.usage.forecast', ''),
})
