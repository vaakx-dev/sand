import { tokens, tokensOf } from '@sand/kit'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
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
  menu: ContextMenu
}

const nameCell = ({ plainButton }: Kit, row: Row) => {
  const note = row.note ? span({ class: 'shrink-0 text-xs whitespace-nowrap text-neutral-500' }, row.note) : null
  const name = row.open
    ? plainButton({ class: 'min-w-0 shrink truncate rounded-sm text-left hover:underline', title: row.hint }, row.name)
    : span({ class: 'min-w-0 shrink truncate', title: row.hint }, row.name)
  return div({ class: 'flex min-w-0 flex-1 items-baseline gap-2 text-sm text-neutral-100' }, name, note)
}

const shareBar = (row: Row, { accounts, colorOf, peak, metric }: ListParts) => {
  const provider = accounts.get(row.accounts[0] ?? '')?.provider
  const width = peak > 0 ? Math.max(1.5, (metricValue(row.totals, metric) / peak) * 100) : 0
  return div(
    { class: 'h-1 w-1/4 shrink-0 overflow-hidden rounded-full bg-neutral-800 sm:w-1/3' },
    div({ class: 'h-full rounded-full bg-accent-500', style: { width: `${width}%`, ...(provider && { backgroundColor: colorOf(provider) }) } }),
  )
}

const valueText = (row: Row, metric: Metric) => (metric === 'cost' ? costText(row.totals) : tokens(tokensOf(row.totals.usage)))

const rowView = (row: Row, parts: ListParts) =>
  div(
    {
      class: ['flex items-center gap-3 bg-neutral-900 px-4 py-3 transition-colors', row.open && 'cursor-pointer hover:bg-neutral-800'],
      ...(row.menu ? parts.menu.target(row.menu, row.open) : { onClick: row.open }),
    },
    nameCell(parts.kit, row),
    shareBar(row, parts),
    span({ class: 'w-20 shrink-0 text-right text-sm text-neutral-100 tabular-nums' }, valueText(row, parts.metric)),
  )

export const breakdownList = (kit: Kit, rows: Row[], accounts: Account[], metric: Metric) => {
  const { contextMenu } = kit
  const menu = contextMenu()
  const parts: ListParts = {
    kit,
    metric,
    accounts: new Map(accounts.map(account => [account.key, account])),
    colorOf: colorsOf(kit, accounts),
    peak: Math.max(0, ...rows.map(row => metricValue(row.totals, metric))),
    menu,
  }
  return div({ class: 'contents' }, menu.view(), ...rows.map(row => rowView(row, parts)))
}
