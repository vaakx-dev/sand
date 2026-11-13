import type { Kit } from '@sand/ui-kit/contract'
import { emptyTotals, type UsageTotals } from '@sand/usage/contract'
import { grouped } from '@sand/util'
import { colorVar, span } from '@vaakx-dev/vrui'
import { addTotals } from '../../data/totals'
import type { Merged } from '../../data/types'
import { metricValue, type Metric } from '../../format'
import { periodKeys } from '../../range'

export interface Series {
  key: string
  label: string
  color: string
  opacity: number
  values: number[]
  total: number
}

interface ModelTotals {
  name: string
  label: string
  provider: string
  totals: UsageTotals
}

const NAMED = 5
const OTHER = 'other'
const SHADES = [1, 0.6, 0.35, 0.2]

const modelTotals = ({ models }: Merged) => {
  const byName = new Map<string, ModelTotals>()
  for (const model of models)
    addTotals(grouped(byName, model.name, () => ({ name: model.name, label: model.label, provider: model.provider, totals: emptyTotals() })).totals, model)
  return [...byName.values()]
}

const shading = (kit: Kit, named: ModelTotals[]) => {
  const providers = [...new Set(named.map(model => model.provider))]
  const ranks = new Map<string, number>()
  return (model: ModelTotals) => {
    const rank = ranks.get(model.provider) ?? 0
    ranks.set(model.provider, rank + 1)
    return { color: kit.providerColor(model.provider, providers.indexOf(model.provider)), opacity: SHADES[Math.min(rank, SHADES.length - 1)] ?? 1 }
  }
}

export const seriesOf = (kit: Kit, usage: Merged, metric: Metric) => {
  const keys = periodKeys(usage.since, usage.until, usage.bucket)
  const periods = new Map(usage.periods.map(period => [period.key, period]))
  const ranked = modelTotals(usage)
    .filter(model => metricValue(model.totals, metric) > 0)
    .toSorted((first, second) => metricValue(second.totals, metric) - metricValue(first.totals, metric))
  const named = ranked.slice(0, NAMED)
  const others = new Set(ranked.slice(NAMED).map(model => model.name))
  const shade = shading(kit, named)
  const valuesOf = (names: (name: string) => boolean) =>
    keys.map(key =>
      Object.entries(periods.get(key)?.models ?? {})
        .filter(([name]) => names(name))
        .reduce((sum, [, totals]) => sum + metricValue(totals, metric), 0),
    )
  const series: Series[] = named.map(model => ({ key: model.name, label: model.label, ...shade(model), values: valuesOf(name => name === model.name), total: metricValue(model.totals, metric) }))
  if (others.size) {
    const values = valuesOf(name => others.has(name))
    series.push({ key: OTHER, label: `${others.size} more`, color: colorVar('neutral', 500), opacity: 0.6, values, total: values.reduce((sum, value) => sum + value, 0) })
  }
  return { keys, series }
}

export const swatch = ({ color, opacity }: Pick<Series, 'color' | 'opacity'>) =>
  span({ class: 'h-2 w-2 shrink-0 rounded-sm', style: { backgroundColor: color, opacity } })
