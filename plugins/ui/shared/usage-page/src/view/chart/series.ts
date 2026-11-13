import type { Kit } from '@sand/ui-kit/contract'
import { emptyTotals, type UsageTotals } from '@sand/usage/contract'
import { grouped } from '@sand/util'
import { colorVar } from '@vaakx-dev/vrui'
import { modelShades } from '../../look'
import { addTotals } from '../../data/totals'
import type { Merged } from '../../data/types'
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

const modelTotals = ({ models }: Merged) => {
  const byName = new Map<string, ModelTotals>()
  for (const model of models)
    addTotals(grouped(byName, model.name, () => ({ name: model.name, label: model.label, provider: model.provider, totals: emptyTotals() })).totals, model)
  return [...byName.values()]
}

export const seriesOf = (kit: Kit, usage: Merged) => {
  const keys = periodKeys(usage.since, usage.until, usage.bucket)
  const periods = new Map(usage.periods.map(period => [period.key, period]))
  const ranked = modelTotals(usage)
    .filter(model => model.totals.cost > 0)
    .toSorted((first, second) => second.totals.cost - first.totals.cost)
  const named = ranked.slice(0, NAMED)
  const others = new Set(ranked.slice(NAMED).map(model => model.name))
  const shade = modelShades(kit, named)
  const valuesOf = (names: (name: string) => boolean) =>
    keys.map(key =>
      Object.entries(periods.get(key)?.models ?? {})
        .filter(([name]) => names(name))
        .reduce((sum, [, totals]) => sum + totals.cost, 0),
    )
  const series: Series[] = named.map(model => ({ key: model.name, label: model.label, ...shade(model), values: valuesOf(name => name === model.name), total: model.totals.cost }))
  if (others.size) {
    const values = valuesOf(name => others.has(name))
    series.push({ key: OTHER, label: `${others.size} more`, color: colorVar('neutral', 500), opacity: 0.6, values, total: values.reduce((sum, value) => sum + value, 0) })
  }
  return { keys, series }
}
