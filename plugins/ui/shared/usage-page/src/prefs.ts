import { stored } from '@sand/dom'
import { ranges, type Range } from './range'

export const allPcs = ''

export const usagePrefs = () => ({
  range: stored<Range>('sand.usage.range', '30d', value => ranges.includes(value as Range)),
  pc: stored<string>('sand.usage.pc', allPcs),
})
