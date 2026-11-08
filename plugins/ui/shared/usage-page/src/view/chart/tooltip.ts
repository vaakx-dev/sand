import { periodTitle, type UsageBucket } from '@sand/usage/contract'
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

const placement = ({ x, y }: Pick<Hover, 'x' | 'y'>) => {
  const right = x < innerWidth / 2
  const below = y < innerHeight / 2
  return {
    left: `${right ? x + gap : x - gap}px`,
    top: `${below ? y + gap : y - gap}px`,
    transform: `translate(${right ? '0' : '-100%'}, ${below ? '0' : '-100%'})`,
  }
}

const tipRow = ({ metaLine, rowTitle }: Kit, label: Child, value: string) =>
  div({ class: 'flex items-center justify-between gap-4' }, metaLine(label), span({ class: 'tabular-nums' }, rowTitle(value)))

const tipBox = ({ layer, metaLine }: Kit, at: Pick<Hover, 'x' | 'y'>, title: string, ...rows: Child[]) =>
  portal(
    document.body,
    div(
      {
        class: [
          layer.tooltip,
          'pointer-events-none fixed flex min-w-40 flex-col gap-1 rounded-xl bg-neutral-800 px-3 py-2 whitespace-nowrap shadow-xl',
        ],
        style: placement(at),
      },
      div({ class: 'mb-1 flex' }, metaLine(title)),
      ...rows,
    ),
  )

export const tooltip = (kit: Kit, hover: Hover, key: string, bucket: UsageBucket, series: Series[], metric: Metric) => {
  const valueAt = (line: Series) => line.values[hover.index] ?? 0
  const total = series.reduce((sum, line) => sum + valueAt(line), 0)
  return tipBox(
    kit,
    hover,
    periodTitle(key, bucket),
    series.map(line => tipRow(kit, seriesName(kit, line), metricText(valueAt(line), metric))),
    series.length > 1 ? div({ class: 'mt-2 font-medium' }, tipRow(kit, 'Total', metricText(total, metric))) : null,
  )
}
