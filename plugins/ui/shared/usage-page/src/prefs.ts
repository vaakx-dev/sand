import { usageRanges, type UsageRange } from '@sand/usage/records'
import { stored } from '@vaakx-dev/vrui'

export const allPcs = ''

export const tabs = ['usage', 'cost', 'tokens'] as const

export type Tab = (typeof tabs)[number]

export const usagePrefs = () => ({
  range: stored<UsageRange>('sand.usage.range', '30d', value => usageRanges.some(range => range === value)),
  pc: stored<string>('sand.usage.pc', allPcs),
  tab: stored<Tab>('sand.usage.tab', 'usage', value => tabs.some(tab => tab === value)),
})
