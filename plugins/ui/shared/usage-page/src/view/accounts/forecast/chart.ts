import type { LimitWindow } from '@sand/llm-accounts/contract'
import { percent } from '@sand/kit'
import type { Kit } from '@sand/ui-kit/contract'
import { colorVar, div, dynamicChild, line, path, rect, sig, span, svg } from '@vaakx-dev/vrui'
import type { Forecast, Point } from '../../../data/forecast/project'
import { cssPercent } from '../../chart/scale'
import { tipBox, tipRow } from '../../chart/tooltip'
import { ticksOf } from './ticks'

const width = 1000
const height = 170
const top = 6
const levels = [1, 0.5, 0]

interface Hover {
  at: number
  x: number
  y: number
}

const timeText = (at: number) => new Date(at).toLocaleString('en', { weekday: 'short', hour: 'numeric', minute: '2-digit' })

const nearest = (points: Point[], at: number) =>
  points.reduce((best, point) => (Math.abs(point.at - at) < Math.abs(best.at - at) ? point : best), points[0]!)

const tag = (text: string, at: string, look = 'top-0 translate-x-1 text-neutral-500') =>
  span({ class: ['pointer-events-none absolute text-xs', look], style: { left: at } }, text)

export const forecastChart = (kit: Kit, window: LimitWindow, forecast: Forecast, color: string) => {
  const { start, end, now, reset, outAt } = forecast
  const toX = (at: number) => ((at - start) / (end - start)) * width
  const toY = (left: number) => height - left * (height - top)
  const trace = (points: Point[]) => points.map((point, index) => `${index ? 'L' : 'M'}${toX(point.at).toFixed(1)},${toY(point.left).toFixed(1)}`).join(' ')
  const band = `${trace(forecast.high)} ${forecast.low
    .toReversed()
    .map(point => `L${toX(point.at).toFixed(1)},${toY(point.left).toFixed(1)}`)
    .join(' ')} Z`
  const at = (time: number) => cssPercent(toX(time) / width)
  const hover = sig<Hover | undefined>(undefined)
  const guideX = () => toX(hover.get()?.at ?? start)
  const track = (event: PointerEvent) => {
    if (!(event.currentTarget instanceof Element)) return
    const box = event.currentTarget.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
    hover.set({ at: start + fraction * (end - start), x: event.clientX, y: event.clientY })
  }
  const tip = ({ at: time, x, y }: Hover) => {
    const ahead = time > now
    const point = nearest(ahead ? forecast.ahead : forecast.past, time)
    return tipBox(kit, { x, y }, ahead ? `${timeText(time)} · forecast` : timeText(time), tipRow(`${window.label} left`, percent(point.left)))
  }
  const stroke = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' } as const

  return div(
    { class: 'flex flex-col gap-2' },
    div(
      { class: 'flex gap-2' },
      div(
        { class: 'relative h-48 w-12 shrink-0' },
        levels.map(level =>
          span(
            { class: 'absolute right-0 -translate-y-1/2 text-xs text-neutral-500 tabular-nums', style: { top: cssPercent(toY(level) / height) } },
            percent(level),
          ),
        ),
      ),
      div(
        { class: 'relative h-48 min-w-0 flex-1 cursor-default', onPointerMove: track, onPointerLeave: () => hover.set(undefined) },
        svg(
          { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', width: '100%', height: '100%', role: 'img', 'aria-label': `${window.label} limit left, with forecast` },
          levels.map(level => line({ x1: 0, x2: width, y1: toY(level), y2: toY(level), stroke: colorVar('neutral', 800), vectorEffect: 'non-scaling-stroke' })),
          outAt ? rect({ x: toX(outAt), y: 0, width: toX(reset) - toX(outAt), height, fill: colorVar('danger', 500), fillOpacity: 0.12 }) : null,
          path({ d: `${trace(forecast.past)} L${toX(now)},${height} L0,${height} Z`, fill: color, fillOpacity: 0.08 }),
          path({ d: band, fill: color, fillOpacity: 0.08 }),
          path({ d: trace(forecast.past), ...stroke }),
          path({ d: trace(forecast.ahead), ...stroke, strokeDasharray: '5 4' }),
          line({ x1: toX(now), x2: toX(now), y1: 0, y2: height, stroke: colorVar('neutral', 500), strokeDasharray: '2 3', vectorEffect: 'non-scaling-stroke' }),
          line({ x1: toX(reset), x2: toX(reset), y1: 0, y2: height, stroke: colorVar('neutral', 700), vectorEffect: 'non-scaling-stroke' }),
          line({
            x1: guideX,
            x2: guideX,
            y1: top,
            y2: height,
            stroke: colorVar('neutral', 500),
            vectorEffect: 'non-scaling-stroke',
            visibility: () => (hover.get() ? 'visible' : 'hidden'),
          }),
        ),
        tag('Now', at(now)),
        tag('Reset', at(reset)),
        outAt ? tag('Out', cssPercent((toX(outAt) + toX(reset)) / 2 / width), 'top-4 -translate-x-1/2 text-danger-400') : null,
        dynamicChild(hover, current => (current ? tip(current) : null)),
      ),
    ),
    div(
      { class: 'flex gap-2 text-xs text-neutral-500' },
      span({ class: 'w-12 shrink-0' }),
      div(
        { class: 'relative h-4 min-w-0 flex-1' },
        ticksOf(start, end).map(tick => span({ class: 'absolute -translate-x-1/2 whitespace-nowrap', style: { left: at(tick.at) } }, tick.label)),
      ),
    ),
  )
}
