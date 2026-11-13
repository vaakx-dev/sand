import { dollars, percent } from '@sand/util'
import { div, span } from '@vaakx-dev/vrui'
import type { Merged } from '../../data/types'
import { swatch } from '../../look'
import type { Series } from '../chart/series'

const count = new Intl.NumberFormat('en')

export const headline = ({ total }: Merged) =>
  div(
    { class: 'flex flex-col gap-1' },
    span({ class: 'text-3xl font-semibold tracking-tight text-neutral-100 tabular-nums' }, dollars(total.cost)),
    span({ class: 'text-xs text-neutral-500' }, `At API prices · ${count.format(total.turns)} turns`),
  )

export const modelList = (series: Series[]) => {
  const sum = series.reduce((total, line) => total + line.total, 0)
  return div(
    { class: 'flex flex-col gap-2' },
    series.map(line =>
      div(
        { class: 'flex items-center gap-2 text-sm' },
        swatch(line),
        span({ class: 'min-w-0 truncate text-neutral-200' }, line.label),
        span({ class: 'text-xs text-neutral-500 tabular-nums' }, sum ? percent(line.total / sum) : ''),
        span({ class: 'ml-auto text-neutral-100 tabular-nums' }, dollars(line.total)),
      ),
    ),
  )
}
