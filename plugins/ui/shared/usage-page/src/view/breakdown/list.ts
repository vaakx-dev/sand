import { percent } from '@sand/util'
import { div, span, type Child } from '@vaakx-dev/vrui'
import { costText, metricText, metricValue, type Metric } from '../../format'
import type { Row } from './rows'

interface ListParts {
  metric: Metric
  total: number
  peak: number
}

const OTHER: Record<Metric, Metric> = { cost: 'tokens', tokens: 'cost' }

const TITLES: Record<Metric, string> = { cost: 'Cost', tokens: 'Tokens' }

const valueText = (row: Row, metric: Metric) => (metric === 'cost' ? costText(row.totals) : metricText(metricValue(row.totals, metric), metric))

const cells = (rank: Child, name: Child, value: Child, share: Child, other: Child, look: string) =>
  div(
    { class: ['flex items-center gap-3 border-b border-neutral-700', look] },
    span({ class: 'w-5 shrink-0 text-xs text-neutral-500 tabular-nums' }, rank),
    div({ class: 'flex min-w-0 flex-1 flex-col gap-1.5' }, name),
    span({ class: 'w-20 shrink-0 text-right tabular-nums' }, value),
    span({ class: 'w-12 shrink-0 text-right tabular-nums' }, share),
    span({ class: 'hidden w-16 shrink-0 text-right tabular-nums sm:block' }, other),
  )

const shareBar = (fraction: number) =>
  div({ class: 'w-3/4 overflow-hidden rounded-full', style: { height: '2px' } }, div({ class: 'h-full rounded-full bg-neutral-100/40', style: { width: `${Math.max(1.5, fraction * 100)}%` } }))

const rowView = (row: Row, index: number, { metric, total, peak }: ListParts) => {
  const value = metricValue(row.totals, metric)
  return cells(
    String(index + 1),
    [
      div(
        { class: 'flex min-w-0 items-baseline gap-2' },
        span({ class: 'truncate text-sm text-neutral-100', title: row.hint }, row.name),
        row.note ? span({ class: 'truncate text-xs text-neutral-500' }, row.note) : null,
      ),
      shareBar(peak ? value / peak : 0),
    ],
    span({ class: 'text-sm text-neutral-100' }, valueText(row, metric)),
    span({ class: 'text-sm text-neutral-400' }, total ? percent(value / total) : ''),
    span({ class: 'text-sm text-neutral-400' }, valueText(row, OTHER[metric])),
    'py-3',
  )
}

const head = (label: string, metric: Metric) => {
  const title = (text: string) => span({ class: 'text-xs text-neutral-500' }, text)
  return cells(title('#'), title(label), title(TITLES[metric]), title('Share'), title(TITLES[OTHER[metric]]), 'pt-1 pb-2')
}

export const breakdownList = (label: string, rows: Row[], all: Row[], metric: Metric) => {
  const values = all.map(row => metricValue(row.totals, metric))
  const parts: ListParts = { metric, total: values.reduce((sum, value) => sum + value, 0), peak: Math.max(0, ...values) }
  return div({ class: 'flex flex-col' }, head(label, metric), rows.map((row, index) => rowView(row, index, parts)))
}
