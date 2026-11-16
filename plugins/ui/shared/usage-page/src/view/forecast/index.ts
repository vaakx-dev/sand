import { percent } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { colorVar, div, line, sig, span, svg, type Child, type Sig } from '@vaakx-dev/vrui'
import type { Forecast } from '@sand/usage/contract'
import type { Gauge } from '../../data/gauges'
import { whenText } from '../plans/pace'
import { DASH, forecastChart, readout } from './chart'

export interface ForecastProps {
  kit: Kit
  gauges: Gauge[]
  now: number
  chosen: Sig<string>
}

const labelOf = ({ plan, window }: Gauge) => `${plan.label} ${window.label}`

const timed = ({ window }: Gauge) => window.members.some(member => member.window.duration)

const urgency = ({ forecast }: Gauge) => {
  if (!forecast) return 2
  return forecast.outAt === undefined ? 1 : 0
}

const longest = ({ window }: Gauge) => Math.max(0, ...window.members.map(member => member.window.duration ?? 0))

const pick = (gauges: Gauge[], chosen: string) =>
  gauges.find(gauge => gauge.key === chosen) ??
  gauges.toSorted((first, second) => urgency(first) - urgency(second) || (first.forecast?.outAt ?? 0) - (second.forecast?.outAt ?? 0) || longest(second) - longest(first))[0]

const verdict = ({ outAt, backAt, reset, leftAtReset }: Forecast, now: number) => {
  if (outAt !== undefined && outAt <= now) return span({ class: 'text-danger-400' }, `Used up until ${whenText(backAt ?? reset)}`)
  if (outAt !== undefined) return span({ class: 'text-warning-400' }, `At this pace you run out ${whenText(outAt)}`)
  return span(`At this pace about ${percent(leftAtReset)} is left unused by ${whenText(reset)}`)
}

const legendLine = (color: string, dashed: boolean) =>
  svg(
    { viewBox: '0 0 18 6', width: 18, height: 6, class: 'shrink-0', 'aria-hidden': 'true' },
    line({ x1: 0, x2: 18, y1: 3, y2: 3, stroke: color, strokeWidth: 2, ...(dashed && { strokeDasharray: DASH }) }),
  )

const legend = ({ metaLine }: Kit, color: string) =>
  div(
    { class: 'flex flex-wrap gap-x-4 gap-y-1' },
    ([
      [color, false, 'Left'],
      [color, true, 'Forecast'],
      [colorVar('neutral', 500), true, 'Even pace'],
    ] as const).map(([color, dashed, label]) => span({ class: 'inline-flex items-center gap-2' }, legendLine(color, dashed), metaLine(label))),
  )

const chooser = (kit: Kit, gauges: Gauge[], shown: Gauge, chosen: Sig<string>) => {
  if (gauges.length < 2) return null
  const { choiceItem, dropdown, icon, secondaryAction } = kit
  return dropdown({
    placement: 'below-right',
    trigger: press => secondaryAction({ ...press, title: 'Limit to forecast', class: 'max-w-64' }, span({ class: 'truncate' }, labelOf(shown)), icon('down', 'sm')),
    items: close =>
      gauges.map(gauge =>
        choiceItem(
          {
            selected: () => gauge.key === shown.key,
            onClick: () => {
              chosen.set(gauge.key)
              close()
            },
          },
          span({ class: 'min-w-0 flex-1 truncate' }, labelOf(gauge)),
        ),
      ),
  })
}

const missing = ({ window, state }: Gauge) =>
  state.left <= 0 ? `The ${window.label.toLowerCase()} limit is used up until it resets.` : `There isn't enough usage in sand yet to forecast the ${window.label.toLowerCase()} limit.`

const body = (kit: Kit, shown: Gauge, now: number): Child => {
  const { forecast } = shown
  if (!forecast) return kit.secondaryText(missing(shown))
  const hovered = sig<number | undefined>(undefined)
  const color = kit.providerColor(shown.plan.provider)
  return div(
    { class: 'flex flex-col gap-3' },
    div({ class: 'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm' }, readout(kit, forecast, hovered), span({ class: 'text-xs text-neutral-500' }, verdict(forecast, now))),
    forecastChart(kit, labelOf(shown), forecast, color, hovered),
    legend(kit, color),
  )
}

export const forecastSection = ({ kit, gauges, now, chosen }: ForecastProps) => {
  const shown = gauges.filter(timed)
  const picked = pick(shown, chosen.get())
  return picked ? kit.pageSection({ title: 'Forecast', action: chooser(kit, shown, picked, chosen) }, body(kit, picked, now)) : null
}
