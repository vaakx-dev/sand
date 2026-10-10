import type { UsageTotals } from '@sand/usage/contract'
import { tildeHome, type Child, type MenuSpec } from '@sand/dom'
import { folderName, periodTitle } from '@sand/kit'
import { addTotals, byCost, emptyTotals, grouped, including } from '../../data/totals'
import type { Merged } from '../../data/types'
import { chip, muted } from '../parts'
import { pcMenu, threadMenu } from './menu'

export type Breakdown = 'projects' | 'models' | 'threads' | 'pcs' | 'periods'

export interface Row {
  key: string
  name: string
  hint?: string
  extra: Child[]
  accounts: string[]
  totals: UsageTotals
  open?: () => void
  menu?: () => MenuSpec
}

export interface RowSource {
  usage: Merged
  nameOf(id: string): string
  openThread?: (id: string) => void
  copy(text: string, what: string): void
  showOnly(pc: string): void
}

const top = 10

const pcChips = (ids: string[], { usage, nameOf }: RowSource) => (usage.pcs.length > 1 ? ids.map(id => chip(nameOf(id))) : [])

const projectRows = (source: RowSource): Row[] =>
  source.usage.projects.map(project => ({ key: project.name, name: project.name, extra: pcChips(project.machines, source), accounts: project.accounts, totals: project }))

const modelRows = ({ usage }: RowSource): Row[] => {
  const byModel = new Map<string, Row>()
  for (const model of usage.models) {
    const row = grouped(byModel, model.name, (): Row => ({ key: model.name, name: model.label, hint: model.name, extra: [], accounts: [], totals: emptyTotals() }))
    addTotals(row.totals, model)
    including(row.accounts, [model.account])
  }
  return [...byModel.values()]
}

const threadRows = (source: RowSource): Row[] =>
  source.usage.threads.map(thread => ({
    key: thread.id,
    name: thread.title ?? 'Untitled',
    hint: [thread.title, thread.cwd && tildeHome(thread.cwd)].filter(Boolean).join('\n'),
    extra: [thread.cwd ? muted(folderName(thread.cwd)) : null, ...pcChips([thread.machine], source)],
    accounts: thread.accounts,
    totals: thread,
    open: source.openThread && (() => source.openThread?.(thread.id)),
    menu: threadMenu(thread, source),
  }))

const pcRows = (source: RowSource): Row[] =>
  source.usage.pcs.map(pc => ({ key: pc.id, name: pc.name, extra: [], accounts: pc.accounts, totals: pc, menu: pcMenu(pc, source) }))

const periodRows = ({ usage }: RowSource): Row[] =>
  usage.periods
    .filter(period => period.turns)
    .toReversed()
    .map(period => ({
      key: period.key,
      name: periodTitle(period.key, usage.bucket),
      extra: [],
      accounts: Object.keys(period.accounts).filter(key => period.accounts[key]?.turns),
      totals: period,
    }))

const builders: Record<Breakdown, (source: RowSource) => Row[]> = {
  projects: projectRows,
  models: modelRows,
  threads: threadRows,
  pcs: pcRows,
  periods: periodRows,
}

export const rowsOf = (source: RowSource, view: Breakdown) => {
  const rows = builders[view](source)
  const sorted = view === 'periods' ? rows : rows.sort((a, b) => byCost(a.totals, b.totals))
  return sorted.slice(0, top)
}
