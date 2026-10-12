import type { UsageBucket } from '@sand/usage/contract'
import { periodTitle } from '@sand/kit'
import type { Kit } from '@sand/ui-kit/contract'
import { div, portal, span, type Child } from '@vaakx-dev/vrui'
import { metricText, type Metric } from '../../format'
import { seriesName } from './legend'
import type { Series } from './series'

export interface Hover {
  index: number
  x: number
  y: number
}

const gap = 12

const placement = ({ x, y }: Hover) => {
  const right = x < innerWidth / 2
  const below = y < innerHeight / 2
  return {
    left: `${right ? x + gap : x - gap}px`,
    top: `${below ? y + gap : y - gap}px`,
    transform: `translate(${right ? '0' : '-100%'}, ${below ? '0' : '-100%'})`,
  }
}

const row = (label: Child, value: string) =>
  div({ class: 'flex items-center justify-between gap-4' }, span({ class: 'text-neutral-500' }, label), span({ class: 'text-neutral-100 tabular-nums' }, value))

export const tooltip = (kit: Kit, hover: Hover, key: string, bucket: UsageBucket, series: Series[], metric: Metric) => {
  const { layer } = kit
  const valueAt = (line: Series) => line.values[hover.index] ?? 0
  const total = series.reduce((sum, line) => sum + valueAt(line), 0)
  return portal(
    document.body,
    div(
      {
        class: [
          layer.tooltip,
          'pointer-events-none fixed flex min-w-40 flex-col gap-1 rounded-xl bg-neutral-800 px-3 py-2 text-xs whitespace-nowrap shadow-lg ring-1 ring-neutral-700',
        ],
        style: placement(hover),
      },
      span({ class: 'mb-1 text-neutral-500' }, periodTitle(key, bucket)),
      series.map(line => row(seriesName(kit, line), metricText(valueAt(line), metric))),
      series.length > 1 ? div({ class: 'mt-1 border-t border-neutral-700 pt-1' }, row('Total', metricText(total, metric))) : null,
    ),
  )
}
