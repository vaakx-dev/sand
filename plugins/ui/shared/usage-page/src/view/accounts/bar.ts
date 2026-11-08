import type { LimitWindow } from '@sand/accounts/contract'
import { coarseDuration, exactTime, leftOf, percent } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { div, show, span, type Sig } from '@vaakx-dev/vrui'
import type { Forecast } from '../../data/forecast/project'
import type { Forecasts } from './forecast'
import { verdict } from './forecast/note'

const paceMargin = 0.05

const statusBadge = ({ badge }: Kit, status?: string) => {
  if (!status || status === 'allowed') return null
  if (status === 'rejected') return badge('danger', 'Limit reached')
  return badge('warning', 'Near limit')
}

const elapsedOf = (window: LimitWindow, now: number) => {
  if (!window.duration || !window.resetsAt) return undefined
  const elapsed = 1 - (window.resetsAt - now) / window.duration
  return elapsed > 0 && elapsed < 1 ? elapsed : undefined
}

const aheadOfPace = (window: LimitWindow, now: number) => {
  const elapsed = elapsedOf(window, now)
  return elapsed !== undefined && elapsed > paceMargin && window.used - elapsed > paceMargin
}

const outlook = (window: LimitWindow, now: Sig<number>, forecast?: Forecast) => {
  if (forecast) return span(' · ', verdict(forecast))
  return show(
    () => aheadOfPace(window, now.get()),
    () => span(' · ', span({ class: 'text-warning-400' }, 'ahead of pace')),
  )
}

const resetLine = ({ metaLine }: Kit, window: LimitWindow, now: Sig<number>, forecast?: Forecast) => {
  const { resetsAt } = window
  if (!resetsAt) return metaLine('Not started')
  return metaLine(() => `Resets in ${coarseDuration(Math.max(0, resetsAt - now.get()))}`, outlook(window, now, forecast))
}

const paceTick = (window: LimitWindow, now: Sig<number>) =>
  show(
    () => elapsedOf(window, now.get()) !== undefined,
    () =>
      span({
        class: 'absolute -inset-y-1 w-1 -translate-x-1/2 rounded-full bg-current text-neutral-100',
        title: 'Even pace',
        style: { left: () => `${(1 - (elapsedOf(window, now.get()) ?? 0)) * 100}%` },
      }),
  )

const meter = (window: LimitWindow, left: number, color: string, now: Sig<number>) =>
  div(
    { class: 'relative h-2' },
    div(
      { class: 'h-full overflow-hidden rounded-full bg-neutral-600', role: 'meter', 'aria-label': window.label, 'aria-valuenow': Math.round(left * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 },
      div({ class: 'h-full rounded-full', style: { width: `${left * 100}%`, backgroundColor: color } }),
    ),
    paceTick(window, now),
  )

const limitBar = (kit: Kit, window: LimitWindow, color: string, now: Sig<number>, forecast?: Forecast) => {
  const { metaLine } = kit
  const left = leftOf(window)
  return div(
    {
      class: 'flex w-full min-w-0 flex-col gap-2 tabular-nums sm:w-auto sm:min-w-48 sm:max-w-64 sm:flex-1',
      title: window.resetsAt ? `${percent(left)} left · resets ${exactTime(window.resetsAt)}` : `${percent(left)} left`,
    },
    div(
      { class: 'flex items-baseline gap-2' },
      metaLine(window.label),
      statusBadge(kit, window.status),
      span(
        { class: 'ml-auto flex shrink-0 items-baseline gap-1 whitespace-nowrap' },
        span({ class: 'text-2xl font-semibold text-neutral-100' }, percent(left)),
        metaLine('left'),
      ),
    ),
    meter(window, left, color, now),
    resetLine(kit, window, now, forecast),
  )
}

export const limitBars = (kit: Kit, windows: LimitWindow[], color: string, now: Sig<number>, forecasts?: Forecasts) =>
  div({ class: 'flex flex-wrap items-start gap-x-8 gap-y-5' }, windows.map(window => limitBar(kit, window, color, now, forecasts?.get(window.id))))
