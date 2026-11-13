import { tokensOf } from '@sand/usage/contract'
import { dollars, percent, tokens } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import type { Merged } from '../../data/types'
import { metricText, onPlanOf, type Metric } from '../../format'
import { isSubscription } from '../../names'
import { type Series, swatch } from '../chart/series'

const count = new Intl.NumberFormat('en')

const headlineNote = ({ total }: Merged, metric: Metric) => {
  const turns = `${count.format(total.turns)} turns`
  return metric === 'cost' ? `At API prices · ${tokens(tokensOf(total.usage))} tokens · ${turns}` : turns
}

export const headline = (usage: Merged, metric: Metric) =>
  div(
    { class: 'flex flex-col gap-1' },
    span({ class: 'text-3xl font-semibold tracking-tight text-neutral-100 tabular-nums' }, metric === 'cost' ? dollars(usage.total.cost) : tokens(tokensOf(usage.total.usage))),
    span({ class: 'text-xs text-neutral-500' }, headlineNote(usage, metric)),
  )

const minorFigure = (label: string, value: string) =>
  div({ class: 'flex items-baseline justify-between gap-3 text-sm' }, span({ class: 'text-neutral-400' }, label), span({ class: 'text-neutral-100 tabular-nums' }, value))

export const billing = ({ accounts, total }: Merged) => {
  const covered = accounts.filter(isSubscription).reduce((sum, account) => sum + onPlanOf(account), 0)
  return div(
    { class: 'flex flex-col gap-1.5' },
    minorFigure('Covered by plans', covered > 0.005 ? `≈${dollars(covered)}` : dollars(0)),
    minorFigure('Billed to you', dollars(total.billed)),
  )
}

export const modelList = (series: Series[], metric: Metric) => {
  const sum = series.reduce((total, line) => total + line.total, 0)
  return div(
    { class: 'flex flex-col gap-2' },
    series.map(line =>
      div(
        { class: 'flex items-center gap-2 text-sm' },
        swatch(line),
        span({ class: 'min-w-0 truncate text-neutral-200' }, line.label),
        span({ class: 'text-xs text-neutral-500 tabular-nums' }, sum ? percent(line.total / sum) : ''),
        span({ class: 'ml-auto text-neutral-100 tabular-nums' }, metricText(line.total, metric)),
      ),
    ),
  )
}

export const tokenFigures = ({ metaLine }: Kit, { total }: Merged) =>
  div(
    { class: 'grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4' },
    (
      [
        ['Input', total.usage.input],
        ['Output', total.usage.output],
        ['Cache reads', total.usage.cacheRead],
        ['Cache writes', total.usage.cacheWrite],
      ] as const
    ).map(([label, value]) => div({ class: 'flex flex-col gap-px' }, metaLine(label), span({ class: 'text-base font-medium text-neutral-100 tabular-nums' }, tokens(value)))),
  )
