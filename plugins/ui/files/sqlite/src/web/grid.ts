import type { Kit } from '@sand/ui-kit/contract'
import { bytes, clip } from '@sand/util'
import { div, span, table, tbody, td, th, thead, tr } from '@vaakx-dev/vrui'
import type { SqlValue } from 'sql.js'
import type { Column, Page } from './database'

const SHOWN_CHARS = 200
const TITLE_CHARS = 2000

const CELL = 'max-w-64 truncate border-b border-neutral-800 px-3 py-1 first:pl-4 last:pr-4'

const NUMERIC_TYPE = /INT|REAL|FLOA|DOUB|NUM|DEC/i

const cell = (value: SqlValue) => {
  if (value === null) return td({ class: [CELL, 'text-neutral-500 italic'] }, 'NULL')
  if (value instanceof Uint8Array) return td({ class: [CELL, 'text-neutral-500'] }, `BLOB · ${bytes(value.length)}`)
  if (typeof value === 'number') return td({ class: [CELL, 'text-right tabular-nums'] }, String(value))
  return td({ class: CELL, title: clip(value, TITLE_CHARS) }, clip(value, SHOWN_CHARS))
}

const heading = ({ name, type }: Column) =>
  th(
    { class: [CELL, 'font-normal', NUMERIC_TYPE.test(type) ? 'text-right' : 'text-left'] },
    span({ class: 'block truncate font-medium text-neutral-100' }, name),
    type ? span({ class: 'block truncate text-neutral-500' }, type) : null,
  )

const grid = (kit: Kit, { columns, hiddenColumns, rows }: Page) =>
  div(
    { class: 'flex flex-col gap-2 pb-3' },
    div(
      { class: 'overflow-x-auto' },
      table(
        { class: 'min-w-full border-collapse text-xs text-neutral-200' },
        thead(tr(...columns.map(heading))),
        tbody(...rows.map(row => tr({ class: 'hover:bg-neutral-900' }, ...row.map(cell)))),
      ),
    ),
    hiddenColumns > 0 ? div({ class: 'px-4' }, kit.metaLine(`${hiddenColumns.toLocaleString()} more columns not shown`)) : null,
  )

export { grid }
