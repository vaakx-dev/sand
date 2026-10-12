import type { ReportRow } from '@sand/server/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, p, span } from '@vaakx-dev/vrui'

export interface Report {
  title: string
  rows: ReportRow[]
}

const pair = (label: string, ...value: (HTMLElement | string)[]) =>
  div(
    { class: 'flex gap-4 py-1 text-sm' },
    span({ class: 'w-24 shrink-0 text-neutral-500 md:w-32' }, label),
    div({ class: 'min-w-0 flex-1 wrap-anywhere text-neutral-100' }, ...value),
  )

const bar = (fraction: number) =>
  div(
    { class: 'my-1 h-2 w-full overflow-hidden rounded-full bg-neutral-700' },
    div({ class: 'h-full rounded-full bg-accent-500', style: { width: `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%` } }),
  )

const rowView = (row: ReportRow) => {
  if (row.kind === 'pair') return pair(row.label, row.value)
  if (row.kind === 'bar') return pair(row.label, bar(row.fraction), span({ class: 'text-xs text-neutral-400' }, row.value))
  return p({ class: ['mt-3 text-xs text-neutral-400', row.mono ? 'whitespace-pre font-mono' : 'whitespace-pre-wrap'] }, row.text)
}

export const reportView = ({ overlay, sheet, sheetBody, sheetHead }: Kit, { title, rows }: Report, close: () => void) =>
  overlay(
    close,
    sheet(
      { 'aria-label': title, size: 'md' },
      sheetHead({ title, close }),
      sheetBody({}, div({}, rows.map(rowView))),
    ),
  )
