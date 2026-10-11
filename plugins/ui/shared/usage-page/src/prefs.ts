import { stored } from '@sand/dom'
import { usageRanges, type UsageRange } from '@sand/kit'

export const allPcs = ''

export const usagePrefs = () => ({
  range: stored<UsageRange>('sand.usage.range', '30d', value => usageRanges.some(range => range === value)),
  pc: stored<string>('sand.usage.pc', allPcs),
})
