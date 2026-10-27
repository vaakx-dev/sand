import { periodLabel } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, path, sig, span } from '@vaakx-dev/vrui'
import type { Merged } from '../../data/types'
import { tickText, type Metric } from '../../format'
import { curve } from './curve'
import { chartFrame, gridLine, guideLine } from './frame'
import { dash } from './legend'
import { cssPercent, scaleFor } from './scale'
import type { Series } from './series'
import { tooltip, type Hover } from './tooltip'

const width = 960
const height = 260
const top = 8

const hoverAt = ({ currentTarget, clientX, clientY }: PointerEvent, count: number): Hover | undefined => {
  if (!(currentTarget instanceof Element)) return undefined
  const box = currentTarget.getBoundingClientRect()
  const x = Math.min(box.width, Math.max(0, clientX - box.left))
  const index = count > 1 ? Math.round((x / box.width) * (count - 1)) : 0
  return { index, x: box.left + (count > 1 ? (index / (count - 1)) * box.width : x), y: clientY }
}

const strokes = (drawn: Series[], toY: (value: number) => number, step: number) =>
  drawn.map(series => {
    const d = curve(series.values.map((value, index) => ({ x: index * step, y: toY(value) })))
    return {
      area: series.dashed ? null : path({ d: `${d} L${width},${height} L0,${height} Z`, fill: series.color, fillOpacity: 0.08 }),
      line: path({
        d,
        fill: 'none',
        stroke: series.color,
        strokeWidth: 2,
        strokeLinejoin: 'round',
        vectorEffect: 'non-scaling-stroke',
        ...(series.dashed && { strokeDasharray: dash }),
      }),
    }
  })

const periodTicks = (usage: Merged, keys: string[]) => {
  const middle = Math.floor((keys.length - 1) / 2)
  return [
    span(periodLabel(keys[0]!, usage.bucket)),
    keys.length > 2 ? span(periodLabel(keys[middle]!, usage.bucket)) : null,
    keys.length > 1 ? span(periodLabel(keys.at(-1)!, usage.bucket)) : null,
  ]
}

export const plot = (kit: Kit, usage: Merged, keys: string[], series: Series[], metric: Metric) => {
  const { top: peak, ticks } = scaleFor(Math.max(0, ...series.flatMap(line => line.values)))
  const toY = (value: number) => height - (value / peak) * (height - top)
  const step = keys.length > 1 ? width / (keys.length - 1) : 0
  const drawn = strokes(series, toY, step)
  const hover = sig<Hover | undefined>(undefined)

  return chartFrame(
    {
      width,
      height,
      label: `${usage.bucket === 'hour' ? 'Hourly' : 'Daily'} ${metric} by account`,
      axis: ticks.map(tick => ({ text: tickText(tick, metric), top: cssPercent(toY(tick) / height) })),
      onPointerMove: event => hover.set(hoverAt(event, keys.length)),
      onPointerLeave: () => hover.set(undefined),
    },
    [
      ticks.map(tick => gridLine(width, toY(tick))),
      drawn.map(stroke => stroke.area),
      drawn.map(stroke => stroke.line),
      guideLine(() => (hover.get()?.index ?? 0) * step, top, height, () => Boolean(hover.get())),
    ],
    [dynamicChild(hover, current => (current ? tooltip(kit, current, keys[current.index]!, usage.bucket, series, metric) : null))],
    periodTicks(usage, keys),
  )
}
