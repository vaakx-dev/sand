import type { UsageTotals } from '@sand/usage/contract'
import { emptyTotals } from '@sand/usage/records'
import { grouped, periodTitle } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { addTotals, including } from '../../data/totals'
import type { Merged } from '../../data/types'
import { metricValue, type Metric } from '../../format'

export const breakdowns = ['projects', 'models', 'accounts', 'pcs', 'periods'] as const

export type Breakdown = (typeof breakdowns)[number]

export interface Row {
  key: string
  name: string
  note?: string
  hint?: string
  accounts: string[]
  totals: UsageTotals
}

export interface RowSource {
  kit: Kit
  usage: Merged
}

const projectRows = ({ usage }: RowSource): Row[] =>
  usage.projects.map(project => ({ key: project.name, name: project.name, accounts: project.accounts, totals: project }))

const modelRows = ({ usage }: RowSource): Row[] => {
  const byModel = new Map<string, Row>()
  for (const model of usage.models) {
    const row = grouped(byModel, model.name, (): Row => ({ key: model.name, name: model.label, hint: model.name, accounts: [], totals: emptyTotals() }))
    addTotals(row.totals, model)
    including(row.accounts, [model.account])
  }
  return [...byModel.values()]
}

const accountRows = ({ usage }: RowSource): Row[] =>
  usage.accounts
    .filter(account => account.turns)
    .map(account => ({ key: account.key, name: account.label, note: account.pcName, accounts: [account.key], totals: account }))

const pcRows = ({ usage }: RowSource): Row[] => usage.pcs.map(pc => ({ key: pc.id, name: pc.name, accounts: pc.accounts, totals: pc }))

const periodRows = ({ usage }: RowSource): Row[] =>
  usage.periods
    .filter(period => period.turns)
    .toReversed()
    .map(period => ({
      key: period.key,
      name: periodTitle(period.key, usage.bucket),
      accounts: Object.keys(period.accounts).filter(key => period.accounts[key]?.turns),
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
