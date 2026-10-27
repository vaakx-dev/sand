import type { LimitWindow } from '@sand/accounts/contract'
import { coarseDuration, exactTime, leftOf, percent } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { div, show, span, type Sig } from '@vaakx-dev/vrui'

const paceMargin = 0.05

const statusBadge = ({ badge }: Kit, status?: string) => {
  if (!status || status === 'allowed') return null
  if (status === 'rejected') return badge('danger', 'Limit reached')
  return badge('warning', 'Near limit')
}

const aheadOfPace = (window: LimitWindow, now: number) => {
  if (!window.duration || !window.resetsAt) return false
  const elapsed = 1 - (window.resetsAt - now) / window.duration
  if (elapsed <= paceMargin || elapsed > 1) return false
  return window.used - elapsed > paceMargin
}

const resetLine = (window: LimitWindow, now: Sig<number>) => {
  const { resetsAt } = window
  if (!resetsAt) return span({ class: 'text-xs text-neutral-500' }, 'Not started')
  const ahead = () => aheadOfPace(window, now.get())
  return span(
    { class: 'text-xs text-neutral-500 tabular-nums' },
    () => `Resets in ${coarseDuration(Math.max(0, resetsAt - now.get()))}`,
    show(ahead, () => span(' · ', span({ class: 'text-warning-400' }, 'ahead of pace'))),
  )
}

const limitBar = (kit: Kit, window: LimitWindow, color: string, now: Sig<number>) => {
  const { metaLine } = kit
  const left = leftOf(window)
  return div(
    {
      class: 'flex w-full min-w-0 flex-col gap-1.5 sm:w-auto sm:min-w-48 sm:max-w-64 sm:flex-1',
      title: window.resetsAt ? `${percent(left)} left · resets ${exactTime(window.resetsAt)}` : `${percent(left)} left`,
    },
    div(
      { class: 'flex items-center gap-2' },
      metaLine(window.label),
      statusBadge(kit, window.status),
      span({ class: 'ml-auto shrink-0 text-sm font-medium whitespace-nowrap text-neutral-100 tabular-nums' }, `${percent(left)} left`),
    ),
    div(
      { class: 'h-2 overflow-hidden rounded-full bg-neutral-600', role: 'meter', 'aria-label': window.label, 'aria-valuenow': Math.round(left * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 },
      div({ class: 'h-full rounded-full', style: { width: `${left * 100}%`, backgroundColor: color } }),
    ),
    resetLine(window, now),
  )
}

export const limitBars = (kit: Kit, windows: LimitWindow[], color: string, now: Sig<number>) =>
  div({ class: 'flex flex-wrap items-center gap-x-8 gap-y-4' }, windows.map(window => limitBar(kit, window, color, now)))
