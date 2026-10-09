import type { LimitWindow } from '@sand/protocol'
import { badge, derive, div, dynamicChild, exactTime, icon, span, type Sig } from '@sand/dom'
import { coarseDuration, leftOf, percent } from '@sand/kit'
import { cssPercent } from '../spend/chart/scale'
import { paceOf, paces } from './pace'

export const statusBadge = (status?: string) => {
  if (!status || status === 'allowed') return null
  if (status === 'rejected') return badge('danger', 'Limit reached')
  const text = status.replaceAll('_', ' ')
  return badge('warning', status === 'allowed_warning' ? 'Near limit' : text.charAt(0).toUpperCase() + text.slice(1))
}

const paceMark = (window: LimitWindow, now: Sig<number>) =>
  dynamicChild(
    derive(() => paceOf(window, now.get())),
    pace => (pace ? span({ class: 'inline-flex text-neutral-500', title: paces[pace].label }, icon(paces[pace].icon, 14)) : span()),
  )

const layer = (style: Record<string, string>) => div({ class: 'absolute', style: { top: '0', bottom: '0', ...style } })

const strip = (window: LimitWindow, color: string, now: Sig<number>) => {
  const left = leftOf(window)
  const reset = window.resetsAt
  return div(
    {
      class: 'relative h-8 min-w-0 flex-1 overflow-hidden rounded-md bg-neutral-800',
      role: 'meter',
      'aria-label': window.label,
      'aria-valuenow': Math.round(left * 100),
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      title: reset ? `${percent(left)} left · resets ${exactTime(reset)}` : `${percent(left)} left`,
    },
    layer({ left: '0', width: cssPercent(left), background: color, opacity: '0.35', borderRadius: 'inherit' }),
    reset && left < 1
      ? layer({ right: '0', width: cssPercent(1 - left), backgroundImage: `repeating-linear-gradient(135deg, ${color} 0 1px, transparent 1px 5px)`, opacity: '0.25' })
      : null,
    div(
      { class: 'relative flex h-full items-center gap-2 px-2 text-xs' },
      span({ class: 'font-semibold text-neutral-100 tabular-nums' }, percent(left)),
      reset
        ? span(
            { class: 'ml-auto flex items-center gap-1 rounded-sm bg-neutral-900 px-2 text-neutral-100 tabular-nums' },
            icon('retry', 11),
            () => coarseDuration(Math.max(0, reset - now.get())),
          )
        : null,
    ),
  )
}

export const windowCard = (window: LimitWindow, color: string, now: Sig<number>) =>
  div(
    { class: 'flex flex-col gap-3 rounded-xl border border-neutral-800 p-4 md:flex-row md:items-center md:gap-6' },
    div(
      { class: 'flex flex-col gap-1 md:w-40 md:shrink-0' },
      span({ class: 'flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-100' }, window.label, statusBadge(window.status)),
      span(
        { class: 'flex items-baseline gap-2' },
        span({ class: 'text-3xl font-semibold text-neutral-100 tabular-nums' }, percent(leftOf(window))),
        span({ class: 'text-sm text-neutral-500' }, 'left'),
        paceMark(window, now),
      ),
    ),
    strip(window, color, now),
  )
