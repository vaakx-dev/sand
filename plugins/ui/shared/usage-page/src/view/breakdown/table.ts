import { button, contextMenu, div, focusable, providerIcon, span, table, tbody, td, th, thead, tr, type ContextMenu } from '@sand/dom'
import { tokens, tokensOf } from '@sand/kit'
import type { Account } from '../../data/types'
import { billedText, planText } from '../../format'
import { shortName } from '../../names'
import { chip } from '../parts'
import type { Row } from './rows'

const numberCell = 'py-3 pl-4 text-right whitespace-nowrap tabular-nums'
const headCell = 'py-2 pl-4 text-right font-normal whitespace-nowrap'

const head = (name: string) =>
  thead(
    tr(
      { class: 'border-b border-neutral-800 text-xs text-neutral-500' },
      th({ class: 'w-full py-2 text-left font-normal' }, name),
      ['Account', 'Billed', 'On plan', 'Tokens'].map(label => th({ class: headCell }, label)),
    ),
  )

const nameCell = (row: Row) =>
  td(
    { class: 'w-full py-3 text-left', style: { maxWidth: '0' } },
    div(
      { class: 'flex min-w-0 items-center gap-2 text-neutral-100', title: row.hint },
      row.open
        ? button({ type: 'button', class: ['truncate rounded-sm text-left hover:underline', focusable] }, row.name)
        : span({ class: 'truncate' }, row.name),
      ...row.extra,
    ),
  )

const accountChips = (keys: string[], accounts: Map<string, Account>) =>
  div(
    { class: 'flex justify-end gap-1' },
    keys.flatMap(key => {
      const account = accounts.get(key)
      return account ? [chip(providerIcon(account.provider, 10), shortName(account))] : []
    }),
  )

const rowView = (row: Row, accounts: Map<string, Account>, menu: ContextMenu) =>
  tr(
    {
      class: ['border-b border-neutral-800 text-sm text-neutral-400 transition-colors', row.open && 'cursor-pointer hover:bg-neutral-800'],
      ...(row.menu ? menu.target(row.menu, row.open) : { onClick: row.open }),
    },
    nameCell(row),
    td({ class: numberCell }, accountChips(row.accounts, accounts)),
    td({ class: [numberCell, 'text-neutral-100'] }, billedText(row.totals)),
    td({ class: numberCell }, planText(row.totals)),
    td({ class: numberCell }, tokens(tokensOf(row.totals.usage))),
  )

export const breakdownTable = (name: string, rows: Row[], accounts: Account[]) => {
  const byKey = new Map(accounts.map(account => [account.key, account]))
  const menu = contextMenu()
  return div(
    { class: 'min-w-0 overflow-auto' },
    menu.view(),
    table({ class: 'w-full', style: { borderCollapse: 'collapse' } }, head(name), tbody(rows.map(row => rowView(row, byKey, menu)))),
  )
}
