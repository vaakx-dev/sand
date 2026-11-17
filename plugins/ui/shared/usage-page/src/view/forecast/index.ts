import { percent } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { colorVar, div, line, sig, span, svg, type Child, type Sig } from '@vaakx-dev/vrui'
import type { Forecast } from '@sand/usage/contract'
import type { Gauge } from '../../data/gauges'
import type { Plan } from '../../data/pool'
import { whenText } from '../plans/pace'
import { DASH, forecastChart, readout } from './chart'

export interface ForecastProps {
  kit: Kit
  gauges: Gauge[]
  now: number
  chosen: Sig<string>
}

interface Forecasted {
  plan: Plan
  limits: Gauge[]
}

const labelOf = ({ plan, window }: Gauge) => `${plan.label} ${window.label}`

const timed = ({ window }: Gauge) => window.members.some(member => member.window.duration)

const longest = ({ window }: Gauge) => Math.max(0, ...window.members.map(member => member.window.duration ?? 0))

const soonestOut = ({ limits }: Forecasted) => Math.min(...limits.map(gauge => gauge.forecast?.outAt ?? Infinity))

const forecastedOf = (gauges: Gauge[]): Forecasted[] =>
  [...Map.groupBy(gauges.filter(timed), gauge => gauge.plan)].map(([plan, limits]) => ({ plan, limits: limits.toSorted((first, second) => longest(second) - longest(first)) }))

const pick = (plans: Forecasted[], chosen: string) => plans.find(({ plan }) => plan.kind === chosen) ?? plans.toSorted((first, second) => soonestOut(first) - soonestOut(second))[0]

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

const chooser = (kit: Kit, plans: Forecasted[], shown: Plan, chosen: Sig<string>) => {
  if (plans.length < 2) return null
  const { choiceItem, dropdown, icon, secondaryAction } = kit
  return dropdown({
    placement: 'below-right',
    trigger: press => secondaryAction({ ...press, title: 'Plan to forecast', class: 'max-w-64' }, span({ class: 'truncate' }, shown.label), icon('down', 'sm')),
    items: close =>
      plans.map(({ plan }) =>
        choiceItem(
          {
            selected: () => plan === shown,
            onClick: () => {
              chosen.set(plan.kind)
              close()
            },
          },
          span({ class: 'min-w-0 flex-1 truncate' }, plan.label),
        ),
      ),
  })
}

const missing = ({ window, state, resetAt }: Gauge) => {
  const name = window.label.toLowerCase()
  if (state.left <= 0) return `The ${name} limit is used up until it resets.`
  return resetAt ? `There isn't enough usage in sand yet to forecast the ${name} limit.` : `The ${name} limit starts with your next message.`
}

const limitForecast = (kit: Kit, gauge: Gauge, now: number): Child => {
  const { forecast } = gauge
  const name = kit.rowName(gauge.window.label)
  if (!forecast) return div({ class: 'flex flex-col gap-1' }, name, kit.secondaryText(missing(gauge)))
  const hovered = sig<number | undefined>(undefined)
  return div(
    { class: 'flex flex-col gap-3' },
    div(
      { class: 'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm' },
      span({ class: 'flex min-w-0 items-baseline gap-3' }, name, readout(kit, forecast, hovered)),
      span({ class: 'text-xs text-neutral-500' }, verdict(forecast, now)),
    ),
    forecastChart(kit, labelOf(gauge), forecast, kit.providerColor(gauge.plan.provider), hovered),
  )
}

const body = (kit: Kit, { plan, limits }: Forecasted, now: number) =>
  div(
    { class: 'flex flex-col gap-8' },
    limits.map(gauge => limitForecast(kit, gauge, now)),
    limits.some(gauge => gauge.forecast) ? legend(kit, kit.providerColor(plan.provider)) : null,
  )

export const forecastSection = ({ kit, gauges, now, chosen }: ForecastProps) => {
  const plans = forecastedOf(gauges)
  const shown = pick(plans, chosen.get())
  return shown ? kit.pageSection({ title: 'Forecast', action: chooser(kit, plans, shown.plan, chosen) }, body(kit, shown, now)) : null
}
