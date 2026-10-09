import type { UsageBucket } from '@sand/protocol'
import { div, providerIcon, span } from '@sand/dom'
import { periodTitle } from '@sand/kit'
import { metricText, type Metric } from '../../../format'
import type { Series } from './series'

export interface Hover {
  index: number
  x: number
  y: number
  width: number
  height: number
}

const gap = 12

const placement = ({ x, y, width, height }: Hover) => {
  const right = x < width / 2
  const below = y < height / 2
  return {
    left: `${right ? x + gap : x - gap}px`,
    top: `${below ? y + gap : y - gap}px`,
    transform: `translate(${right ? '0' : '-100%'}, ${below ? '0' : '-100%'})`,
  }
}

const row = (label: Series['provider'] | 'total', value: string) =>
  div(
    { class: 'flex items-center justify-between gap-4' },
    label === 'total'
      ? span({ class: 'text-neutral-500' }, 'Total')
      : span({ class: 'flex items-center gap-2 text-neutral-500' }, providerIcon(label.id, 12), label.label),
    span({ class: 'text-neutral-100 tabular-nums' }, value),
  )

export const tooltip = (hover: Hover, key: string, bucket: UsageBucket, series: Series[], metric: Metric) =>
  div(
    {
      class: 'pointer-events-none absolute z-10 flex min-w-40 flex-col gap-1 rounded-xl bg-neutral-800 px-3 py-2 text-xs whitespace-nowrap shadow-lg ring-1 ring-neutral-700',
      style: placement(hover),
    },
    span({ class: 'mb-1 text-neutral-500' }, periodTitle(key, bucket)),
    series.map(line => row(line.provider, metricText(line.values[hover.index] ?? 0, metric))),
    series.length > 1
      ? div({ class: 'mt-1 border-t border-neutral-700 pt-1' }, row('total', metricText(series.reduce((sum, line) => sum + (line.values[hover.index] ?? 0), 0), metric)))
      : null,
  )
