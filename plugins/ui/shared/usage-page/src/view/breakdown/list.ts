import { tokens, tokensOf } from '@sand/kit'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import { colorsOf } from '../colors'
import type { Account } from '../../data/types'
import { billedText, onPlanOf, planText } from '../../format'
import { shortName } from '../../names'
import { muted } from '../parts'
import type { Row } from './rows'

interface ListParts {
  kit: Kit
  accounts: Map<string, Account>
  colorOf(provider: string): string
  peak: number
  menu: ContextMenu
}

const nameLine = ({ plainButton }: Kit, row: Row) =>
  div(
    { class: 'flex min-w-0 items-baseline gap-3 text-sm text-neutral-100' },
    row.open
      ? plainButton({ class: 'min-w-0 flex-1 truncate rounded-sm text-left hover:underline', title: row.hint }, row.name)
      : span({ class: 'min-w-0 flex-1 truncate', title: row.hint }, row.name),
    span({ class: 'shrink-0 tabular-nums' }, billedText(row.totals)),
  )

const shareBar = (row: Row, { accounts, colorOf, peak }: ListParts) => {
  const provider = accounts.get(row.accounts[0] ?? '')?.provider
  const width = peak > 0 ? Math.max(1.5, (row.totals.cost / peak) * 100) : 0
  return div(
    { class: 'h-1 overflow-hidden rounded-full bg-neutral-800' },
    div({ class: 'h-full rounded-full bg-accent-500', style: { width: `${width}%`, ...(provider && { backgroundColor: colorOf(provider) }) } }),
  )
}

const accountChips = ({ badge, providerIcon }: Kit, keys: string[], accounts: Map<string, Account>) =>
  keys.flatMap(key => {
    const account = accounts.get(key)
    return account ? [badge('neutral', providerIcon(account.provider, 12), shortName(account))] : []
  })

const detailLine = (row: Row, { accounts, kit }: ListParts) =>
  div(
    { class: 'flex flex-wrap items-center gap-x-2 gap-y-1' },
    ...row.extra,
    muted(`${tokens(tokensOf(row.totals.usage))} tokens`),
    onPlanOf(row.totals) > 0.005 ? muted(`${planText(row.totals)} on plan`) : null,
    ...accountChips(kit, row.accounts, accounts),
  )

const rowView = (row: Row, parts: ListParts) =>
  div(
    {
      class: ['flex flex-col gap-2 bg-neutral-900 px-4 py-3 transition-colors', row.open && 'cursor-pointer hover:bg-neutral-800'],
      ...(row.menu ? parts.menu.target(row.menu, row.open) : { onClick: row.open }),
    },
    nameLine(parts.kit, row),
    shareBar(row, parts),
    detailLine(row, parts),
  )

export const breakdownList = (kit: Kit, rows: Row[], accounts: Account[]) => {
  const { contextMenu } = kit
  const menu = contextMenu()
  const parts: ListParts = {
    kit,
    accounts: new Map(accounts.map(account => [account.key, account])),
    colorOf: colorsOf(kit, accounts),
    peak: Math.max(0, ...rows.map(row => row.totals.cost)),
    menu,
  }
  return div({ class: 'contents' }, menu.view(), ...rows.map(row => rowView(row, parts)))
}
