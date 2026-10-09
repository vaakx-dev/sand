import { stored } from '@sand/dom'
import type { Metric } from './format'
import { ranges, type Range } from './range'

export type View = Metric | 'limits'

export const views: View[] = ['cost', 'tokens', 'limits']

export const usagePrefs = () => ({
  range: stored<Range>('sand.usage.range', '30d', value => ranges.includes(value as Range)),
  view: stored<View>('sand.usage.view', 'cost', value => views.includes(value as View)),
})
