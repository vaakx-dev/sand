import { color, div, dynamicChild, line, path, sig, span, svg } from '@sand/dom'
import { periodLabel } from '@sand/kit'
import type { Merged } from '../../data/types'
import { tickText, type Metric } from '../../format'
import { curve } from './curve'
import { dash } from './legend'
import { cssPercent, scaleFor } from './scale'
import type { Series } from './series'
import { tooltip, type Hover } from './tooltip'

const width = 960
const height = 260
const top = 8

const hoverAt = (event: PointerEvent, count: number): Hover => {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = Math.min(box.width, Math.max(0, event.clientX - box.left))
  const y = Math.min(box.height, Math.max(0, event.clientY - box.top))
  const index = count > 1 ? Math.round((x / box.width) * (count - 1)) : 0
  return { index, x: count > 1 ? (index / (count - 1)) * box.width : x, y, width: box.width, height: box.height }
}

const axisLabel = (text: string, style: Record<string, string>) =>
  span({ class: 'absolute text-xs text-neutral-500 tabular-nums whitespace-nowrap', style }, text)

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

export const plot = (usage: Merged, keys: string[], series: Series[], metric: Metric) => {
  const { top: peak, ticks } = scaleFor(Math.max(0, ...series.flatMap(line => line.values)))
  const toY = (value: number) => height - (value / peak) * (height - top)
  const step = keys.length > 1 ? width / (keys.length - 1) : 0
  const drawn = strokes(series, toY, step)
  const hover = sig<Hover | undefined>(undefined)
  const guideX = () => (hover.get()?.index ?? 0) * step
  const middle = Math.floor((keys.length - 1) / 2)

  return div(
    { class: 'flex flex-col gap-2' },
    div(
      { class: 'flex gap-2' },
      div(
        { class: 'relative h-48 w-12 shrink-0' },
        ticks.map(tick => axisLabel(tickText(tick, metric), { right: '0', top: cssPercent(toY(tick) / height), transform: 'translateY(-50%)' })),
      ),
      div(
        {
          class: 'relative h-48 min-w-0 flex-1 cursor-default',
          onPointerMove: event => hover.set(hoverAt(event, keys.length)),
          onPointerLeave: () => hover.set(undefined),
        },
        svg(
          {
            viewBox: `0 0 ${width} ${height}`,
            preserveAspectRatio: 'none',
            width: '100%',
            height: '100%',
            role: 'img',
            'aria-label': `${usage.bucket === 'hour' ? 'Hourly' : 'Daily'} ${metric} by account`,
          },
          ticks.map(tick => line({ x1: 0, x2: width, y1: toY(tick), y2: toY(tick), stroke: color('neutral', 800), vectorEffect: 'non-scaling-stroke' })),
          drawn.map(stroke => stroke.area),
          drawn.map(stroke => stroke.line),
          line({
            x1: guideX,
            x2: guideX,
            y1: top,
            y2: height,
            stroke: color('neutral', 500),
            vectorEffect: 'non-scaling-stroke',
            visibility: () => (hover.get() ? 'visible' : 'hidden'),
          }),
        ),
        dynamicChild(hover, current => (current ? tooltip(current, keys[current.index]!, usage.bucket, series, metric) : span())),
      ),
    ),
    div(
      { class: 'flex justify-between gap-2 pl-12 text-xs text-neutral-500' },
      span({ class: 'pl-2' }, periodLabel(keys[0]!, usage.bucket)),
      keys.length > 2 ? span(periodLabel(keys[middle]!, usage.bucket)) : null,
      keys.length > 1 ? span(periodLabel(keys.at(-1)!, usage.bucket)) : null,
    ),
  )
}
