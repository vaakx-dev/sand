import type { UsageTotals } from '@sand/usage/contract'
import { emptyTotals, folderName, grouped, periodTitle, tildeHome } from '@sand/kit'
import type { MenuSpec } from '@sand/protocol'
import type { Kit } from '@sand/ui-kit/contract'
import { addTotals, including } from '../../data/totals'
import type { Merged } from '../../data/types'
import { metricValue, type Metric } from '../../format'
import { pcMenu, threadMenu } from './menu'

export const breakdowns = ['projects', 'models', 'threads', 'accounts', 'pcs', 'periods'] as const

export type Breakdown = (typeof breakdowns)[number]

export interface Row {
  key: string
  name: string
  note?: string
  hint?: string
  accounts: string[]
  totals: UsageTotals
  open?: () => void
  menu?: () => MenuSpec
}

export interface RowSource {
  kit: Kit
  usage: Merged
  nameOf(id: string): string
  openThread?: (id: string) => void
  copy(text: string, what: string): void
  showOnly(pc: string): void
}

const countText = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

const projectRows = ({ usage }: RowSource): Row[] =>
  usage.projects.map(project => ({ key: project.name, name: project.name, note: countText(project.threads, 'thread'), accounts: project.accounts, totals: project }))

const modelRows = ({ usage }: RowSource): Row[] => {
  const byModel = new Map<string, Row>()
  for (const model of usage.models) {
    const row = grouped(byModel, model.name, (): Row => ({ key: model.name, name: model.label, hint: model.name, accounts: [], totals: emptyTotals() }))
    addTotals(row.totals, model)
    including(row.accounts, [model.account])
  }
  return [...byModel.values()]
}

const threadRows = (source: RowSource): Row[] => {
  const { openThread } = source
  return source.usage.threads.map(thread => ({
    key: thread.id,
    name: thread.title ?? 'Untitled',
    note: thread.cwd ? folderName(thread.cwd) : undefined,
    hint: [thread.title, thread.cwd && tildeHome(thread.cwd)].filter(Boolean).join('\n'),
    accounts: thread.accounts,
    totals: thread,
    open: openThread && (() => openThread(thread.id)),
    menu: threadMenu(thread, source),
  }))
}

const accountRows = ({ usage }: RowSource): Row[] =>
  usage.accounts
    .filter(account => account.turns)
    .map(account => ({ key: account.key, name: account.label, note: account.pcName, accounts: [account.key], totals: account }))

const pcRows = (source: RowSource): Row[] =>
  source.usage.pcs.map(pc => ({ key: pc.id, name: pc.name, accounts: pc.accounts, totals: pc, menu: pcMenu(pc, source) }))

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
  threads: threadRows,
  accounts: accountRows,
  pcs: pcRows,
  periods: periodRows,
}

export const rowsOf = (source: RowSource, view: Breakdown, metric: Metric) => {
  const rows = builders[view](source)
  return view === 'periods' ? rows : rows.sort((a, b) => metricValue(b.totals, metric) - metricValue(a.totals, metric))
}
