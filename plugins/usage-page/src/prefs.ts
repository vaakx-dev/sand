import { stored } from '@sand/dom'
import type { Metric } from './format'
import { ranges, type Range } from './range'

const metrics: Metric[] = ['cost', 'tokens']

export const usagePrefs = () => ({
  range: stored<Range>('sand.usage.range', '30d', value => ranges.includes(value as Range)),
  metric: stored<Metric>('sand.usage.metric', 'cost', value => metrics.includes(value as Metric)),
})
