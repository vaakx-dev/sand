import { tokensOf } from '@sand/usage/records'
import { tokens } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import { colorsOf } from '../colors'
import type { Account } from '../../data/types'
import { costText, metricValue, type Metric } from '../../format'
import type { Row } from './rows'

interface ListParts {
  kit: Kit
  metric: Metric
  accounts: Map<string, Account>
  colorOf(provider: string): string
  peak: number
}

const shareBar = (row: Row, { accounts, colorOf, peak, metric }: ListParts) => {
  const provider = accounts.get(row.accounts[0] ?? '')?.provider
  const width = peak > 0 ? Math.max(1.5, (metricValue(row.totals, metric) / peak) * 100) : 0
  return div(
    { class: 'hidden h-1 w-32 overflow-hidden rounded-full bg-neutral-700 sm:block' },
    div({ class: 'h-full rounded-full bg-accent-500', style: { width: `${width}%`, ...(provider && { backgroundColor: colorOf(provider) }) } }),
  )
}

const valueText = (row: Row, metric: Metric) => (metric === 'cost' ? costText(row.totals) : tokens(tokensOf(row.totals.usage)))

const rowView = (row: Row, parts: ListParts) =>
  parts.kit.settingsRow(
    { title: span({ title: row.hint }, row.name), detail: row.note },
    shareBar(row, parts),
    span({ class: 'w-20 text-right text-sm text-neutral-100 tabular-nums' }, valueText(row, parts.metric)),
  )

export const breakdownList = (kit: Kit, rows: Row[], accounts: Account[], metric: Metric) => {
  const parts: ListParts = {
    kit,
    metric,
    accounts: new Map(accounts.map(account => [account.key, account])),
    colorOf: colorsOf(kit, accounts),
    peak: Math.max(0, ...rows.map(row => metricValue(row.totals, metric))),
  }
  return div({ class: 'contents' }, rows.map(row => rowView(row, parts)))
}
