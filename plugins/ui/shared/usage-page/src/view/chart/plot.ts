import type { Kit } from '@sand/ui-kit/contract'
import { periodLabel, type UsageBucket } from '@sand/usage/contract'
import { dynamicChild, rect, sig } from '@vaakx-dev/vrui'
import { tickText } from '../../format'
import { chartFrame, gridLine } from './frame'
import { cssPercent, scaleFor } from './scale'
import type { Series } from './series'
import { tooltip, type Hover } from './tooltip'

export interface PlotProps {
  bucket: UsageBucket
  keys: string[]
  series: Series[]
}

const WIDTH = 960
const HEIGHT = 260
const TOP = 8
const GAP = 0.25

const hoverAt = ({ currentTarget, clientX, clientY }: PointerEvent, count: number): Hover | undefined => {
  if (!(currentTarget instanceof Element) || !count) return undefined
  const box = currentTarget.getBoundingClientRect()
  const slot = box.width / count
  const index = Math.min(count - 1, Math.max(0, Math.floor((clientX - box.left) / slot)))
  return { index, x: box.left + (index + 0.5) * slot, y: clientY }
}

const columnBars = (series: Series[], index: number, x: number, width: number, toHeight: (value: number) => number) => {
  let base = HEIGHT
  return series.flatMap(line => {
    const height = toHeight(line.values[index] ?? 0)
    if (height <= 0) return []
    base -= height
    return [rect({ x, y: base, width, height, fill: line.color, fillOpacity: line.opacity })]
  })
}

const periodTicks = ({ metaLine }: Kit, keys: string[], bucket: UsageBucket) => {
  const middle = Math.floor((keys.length - 1) / 2)
  return [
    metaLine(periodLabel(keys[0] ?? '', bucket)),
    keys.length > 2 ? metaLine(periodLabel(keys[middle] ?? '', bucket)) : null,
    keys.length > 1 ? metaLine(periodLabel(keys.at(-1) ?? '', bucket)) : null,
  ]
}

const columnTotals = (series: Series[], count: number) =>
  Array.from({ length: count }, (_, index) => series.reduce((sum, line) => sum + (line.values[index] ?? 0), 0))

export const plot = (kit: Kit, { bucket, keys, series }: PlotProps) => {
  const { top: peak, ticks } = scaleFor(Math.max(0, ...columnTotals(series, keys.length)))
  const toHeight = (value: number) => (value / peak) * (HEIGHT - TOP)
  const slot = WIDTH / Math.max(1, keys.length)
  const barWidth = slot * (1 - GAP)
  const hover = sig<Hover | undefined>(undefined)

  return chartFrame(
    kit,
    {
      width: WIDTH,
      height: HEIGHT,
      label: 'Daily cost by model',
      axis: ticks.map(tick => ({ text: tickText(tick), top: cssPercent((HEIGHT - toHeight(tick)) / HEIGHT) })),
      onPointerMove: event => hover.set(hoverAt(event, keys.length)),
      onPointerLeave: () => hover.set(undefined),
    },
    [ticks.map(tick => gridLine(WIDTH, HEIGHT - toHeight(tick))), keys.map((_, index) => columnBars(series, index, index * slot + (slot - barWidth) / 2, barWidth, toHeight))],
    [dynamicChild(hover, current => (current ? tooltip(kit, current, keys[current.index] ?? '', bucket, series) : null))],
    periodTicks(kit, keys, bucket),
  )
}
