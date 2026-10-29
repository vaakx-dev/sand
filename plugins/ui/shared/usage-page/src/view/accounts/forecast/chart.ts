import type { LimitWindow } from '@sand/accounts/contract'
import { percent } from '@sand/util'
import { colorVar, div, line, path, rect, show, span, type Sig } from '@vaakx-dev/vrui'
import type { Forecast, Point } from '../../../data/forecast/project'
import { chartFrame, gridLine, guideLine } from '../../chart/frame'
import { dash } from '../../chart/legend'
import { cssPercent } from '../../chart/scale'
import { ticksOf } from './ticks'

const width = 1000
const height = 170
const top = 6
const levels = [1, 0.5, 0]
const nowFlip = 0.85
const lastTick = 0.8

const timeText = (at: number) => new Date(at).toLocaleString('en', { weekday: 'short', hour: 'numeric', minute: '2-digit' })

const nearest = (points: Point[], at: number) =>
  points.reduce((best, point) => (Math.abs(point.at - at) < Math.abs(best.at - at) ? point : best), points[0]!)

const pointAt = (forecast: Forecast, at: number) => nearest(at > forecast.now ? forecast.ahead : forecast.past, at)

const tag = (text: string, at: string, look: string) => span({ class: ['pointer-events-none absolute top-0 text-xs text-neutral-500', look], style: { left: at } }, text)

export const readout = (forecast: Forecast, hovered: Sig<number | undefined>) => {
  const point = () => pointAt(forecast, hovered.get() ?? forecast.now)
  const when = () => {
    const at = hovered.get()
    if (at === undefined) return 'Now'
    return at > forecast.now ? `${timeText(point().at)} · forecast` : timeText(point().at)
  }
  return span(
    { class: 'text-xs text-neutral-500 tabular-nums', 'aria-live': 'polite' },
    when,
    ' · ',
    span({ class: 'font-medium text-neutral-100' }, () => `${percent(point().left)} left`),
  )
}

export const forecastChart = (window: LimitWindow, forecast: Forecast, color: string, hovered: Sig<number | undefined>) => {
  const { start, now, reset, outAt } = forecast
  const toX = (at: number) => ((at - start) / (reset - start)) * width
  const toY = (left: number) => height - left * (height - top)
  const trace = (points: Point[]) => points.map((point, index) => `${index ? 'L' : 'M'}${toX(point.at).toFixed(1)},${toY(point.left).toFixed(1)}`).join(' ')
  const band = `${trace(forecast.high)} ${forecast.low
    .toReversed()
    .map(point => `L${toX(point.at).toFixed(1)},${toY(point.left).toFixed(1)}`)
    .join(' ')} Z`
  const at = (time: number) => cssPercent(toX(time) / width)
  const track = (event: PointerEvent) => {
    if (!(event.currentTarget instanceof Element)) return
    const box = event.currentTarget.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
    hovered.set(start + fraction * (reset - start))
  }
  const leave = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') hovered.set(undefined)
  }
  const marked = () => pointAt(forecast, hovered.get() ?? now)
  const stroke = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' } as const

  return chartFrame(
    {
      width,
      height,
      label: `${window.label} limit left, with forecast`,
      axis: levels.map(level => ({ text: percent(level), top: cssPercent(toY(level) / height) })),
      onPointerMove: track,
      onPointerLeave: leave,
    },
    [
      levels.map(level => gridLine(width, toY(level))),
      outAt ? rect({ x: toX(outAt), y: 0, width: width - toX(outAt), height, fill: colorVar('warning', 500), fillOpacity: 0.12 }) : null,
      line({ x1: 0, x2: width, y1: toY(1), y2: toY(0), stroke: colorVar('neutral', 500), strokeDasharray: dash, vectorEffect: 'non-scaling-stroke' }),
      path({ d: `${trace(forecast.past)} L${toX(now)},${height} L0,${height} Z`, fill: color, fillOpacity: 0.08 }),
      path({ d: band, fill: color, fillOpacity: 0.08 }),
      path({ d: trace(forecast.past), ...stroke }),
      path({ d: trace(forecast.ahead), ...stroke, strokeDasharray: dash }),
      line({ x1: toX(now), x2: toX(now), y1: 0, y2: height, stroke: colorVar('neutral', 500), strokeDasharray: '2 3', vectorEffect: 'non-scaling-stroke' }),
      guideLine(() => toX(hovered.get() ?? start), top, height, () => hovered.get() !== undefined),
    ],
    [
      tag('Now', at(now), toX(now) / width > nowFlip ? '-translate-x-full pr-1' : 'translate-x-1'),
      outAt ? div({ class: 'pointer-events-none absolute bottom-0 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-warning-400', style: { left: at(outAt) } }) : null,
      show(
        () => hovered.get() !== undefined,
        () =>
          div({
            class: 'pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-neutral-800',
            style: { backgroundColor: color, left: () => at(marked().at), top: () => cssPercent(toY(marked().left) / height) },
          }),
      ),
    ],
    [
      ...ticksOf(start, reset)
        .filter(tick => toX(tick.at) / width < lastTick)
        .map(tick => span({ class: 'absolute -translate-x-1/2 whitespace-nowrap', style: { left: at(tick.at) } }, tick.label)),
      span({ class: 'absolute right-0 whitespace-nowrap' }, 'Reset'),
    ],
  )
}
