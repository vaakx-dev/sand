import { emptyTotals, periodTitle, type UsageTotals } from '@sand/usage/contract'
import { grouped } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { addTotals } from '../../data/totals'
import type { Merged } from '../../data/types'
import { metricValue, type Metric } from '../../format'

export const breakdowns = ['projects', 'models', 'accounts', 'pcs', 'periods'] as const

export type Breakdown = (typeof breakdowns)[number]

export interface Row {
  key: string
  name: string
  note?: string
  hint?: string
  totals: UsageTotals
}

export interface RowSource {
  kit: Kit
  usage: Merged
  nameOf(pc: string): string
}

const projectRows = ({ usage, nameOf }: RowSource): Row[] =>
  usage.projects.map(project => ({ key: project.name, name: project.name, note: project.machines.map(nameOf).join(', '), totals: project }))

const modelRows = ({ usage }: RowSource): Row[] => {
  const byModel = new Map<string, Row>()
  for (const model of usage.models) {
    const row = grouped(byModel, model.name, (): Row => ({ key: model.name, name: model.label, hint: model.name, totals: emptyTotals() }))
    addTotals(row.totals, model)
  }
  return [...byModel.values()]
}

const accountRows = ({ usage }: RowSource): Row[] =>
  usage.accounts
    .filter(account => account.turns)
    .map(account => ({ key: account.key, name: account.label, note: account.pcName, totals: account }))

const pcRows = ({ usage }: RowSource): Row[] => usage.pcs.map(pc => ({ key: pc.id, name: pc.name, totals: pc }))

const periodRows = ({ usage }: RowSource): Row[] =>
  usage.periods
    .filter(period => period.turns)
    .toReversed()
    .map(period => ({
      key: period.key,
      name: periodTitle(period.key, usage.bucket),
      totals: period,
    }))

const builders: Record<Breakdown, (source: RowSource) => Row[]> = {
  projects: projectRows,
  models: modelRows,
  accounts: accountRows,
  pcs: pcRows,
  periods: periodRows,
}

export const rowsOf = (source: RowSource, view: Breakdown, metric: Metric) => {
  const rows = builders[view](source)
  return view === 'periods' ? rows : rows.sort((a, b) => metricValue(b.totals, metric) - metricValue(a.totals, metric))
}
