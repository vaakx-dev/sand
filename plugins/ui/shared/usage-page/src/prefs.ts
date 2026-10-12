import { usageRanges, type UsageRange } from '@sand/kit'
import { stored } from '@vaakx-dev/vrui'

export const allPcs = ''

export const usagePrefs = () => ({
  range: stored<UsageRange>('sand.usage.range', '30d', value => usageRanges.some(range => range === value)),
  pc: stored<string>('sand.usage.pc', allPcs),
})
