import type { LimitWindow } from '@sand/accounts/contract'
import { percent } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { colorVar, derive, div, dynamicChild, line, sig, span, svg, type Child, type Sig } from '@vaakx-dev/vrui'
import { forecastsOf, type History } from '../../data/forecast'
import type { Forecast } from '../../data/forecast/project'
import { accountName, plansOf } from '../../data/plans'
import type { Account } from '../../data/types'
import { whenText } from '../plans/pace'
import { DASH, forecastChart, readout } from './chart'

export interface ForecastProps {
  kit: Kit
  now: Sig<number>
  history: Sig<History | undefined>
  chosen: Sig<string>
}

interface Entry {
  key: string
  label: string
  account: Account
  window: LimitWindow
  forecast?: Forecast
}

const entriesOf = (accounts: Account[], history: History, now: number) =>
  plansOf(accounts).flatMap(plan =>
    plan.accounts.flatMap(account => {
      const forecasts = forecastsOf(account, history, now)
      const named = plan.accounts.length > 1 ? ` · ${accountName(account)}` : ''
      return (account.limits?.windows ?? [])
        .filter(window => window.resetsAt && window.duration)
        .map((window): Entry => {
          const forecast = forecasts.get(window.id)
          return { key: `${account.key}|${window.id}`, label: `${plan.label} ${window.label}${named}`, account, window, ...(forecast && { forecast }) }
        })
    }),
  )

const urgency = ({ forecast }: Entry) => {
  if (!forecast) return 2
  return forecast.outAt === undefined ? 1 : 0
}

const pick = (entries: Entry[], chosen: string) =>
  entries.find(entry => entry.key === chosen) ?? entries.toSorted((first, second) => urgency(first) - urgency(second) || (first.forecast?.outAt ?? 0) - (second.forecast?.outAt ?? 0) || (second.window.duration ?? 0) - (first.window.duration ?? 0))[0]

const verdict = (forecast: Forecast) =>
  forecast.outAt
    ? span({ class: 'text-warning-400' }, `At this pace you run out ${whenText(forecast.outAt)}`)
    : span(`At this pace about ${percent(forecast.leftAtReset)} is left at the reset, ${whenText(forecast.reset)}`)

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

const chooser = (kit: Kit, entries: Entry[], shown: Entry, chosen: Sig<string>) => {
  if (entries.length < 2) return null
  const { choiceItem, dropdown, icon, secondaryAction } = kit
  return dropdown({
    placement: 'below-right',
    trigger: press => secondaryAction({ ...press, title: 'Limit to forecast', class: 'max-w-64' }, span({ class: 'truncate' }, shown.label), icon('down', 'sm')),
    items: close =>
      entries.map(entry =>
        choiceItem(
          {
            selected: () => entry.key === shown.key,
            onClick: () => {
              chosen.set(entry.key)
              close()
            },
          },
          span({ class: 'min-w-0 flex-1 truncate' }, entry.label),
        ),
      ),
  })
}

const missing = (window: LimitWindow) =>
  window.used >= 1 ? `The ${window.label.toLowerCase()} limit is used up until it resets.` : `There isn't enough usage in sand yet to forecast the ${window.label.toLowerCase()} limit.`

const body = (kit: Kit, shown: Entry): Child => {
  const { forecast } = shown
  if (!forecast) return kit.secondaryText(missing(shown.window))
  const hovered = sig<number | undefined>(undefined)
  const color = kit.providerColor(shown.account.provider)
  return div(
    { class: 'flex flex-col gap-3' },
    div({ class: 'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm' }, readout(kit, forecast, hovered), span({ class: 'text-xs text-neutral-500' }, verdict(forecast))),
    forecastChart(kit, shown.window, forecast, color, hovered),
    legend(kit, color),
  )
}

export const forecastSection = (accounts: Account[], { kit, now, history, chosen }: ForecastProps) => {
  const state = derive(() => {
    const found = history.get()
    const entries = found ? entriesOf(accounts, found, now.get()) : []
    return { entries, shown: pick(entries, chosen.get()) }
  })
  return dynamicChild(state, ({ entries, shown }) =>
    shown
      ? kit.pageSection({ title: 'Forecast', action: chooser(kit, entries, shown, chosen) }, body(kit, shown))
      : null,
  )
}
