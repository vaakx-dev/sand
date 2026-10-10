import type { LimitWindow } from '@sand/llm-accounts/contract'
import { badge, circle, color, derive, div, dynamicChild, exactTime, span, svg, type Sig } from '@sand/dom'
import { coarseDuration, leftOf, percent } from '@sand/kit'
import { paceOf } from './pace'

const size = 48
const radius = 20
const length = 2 * Math.PI * radius

const statusBadge = (status?: string) => {
  if (!status || status === 'allowed') return null
  if (status === 'rejected') return badge('danger', 'Limit reached')
  return badge('warning', 'Near limit')
}

const ring = (left: number, stroke: string, label: string) =>
  svg(
    { viewBox: `0 0 ${size} ${size}`, width: size, height: size, class: 'shrink-0', role: 'img', 'aria-label': `${label}: ${percent(left)} left` },
    circle({ cx: size / 2, cy: size / 2, r: radius, fill: 'none', stroke: color('neutral', 800), strokeWidth: 5 }),
    circle({
      cx: size / 2,
      cy: size / 2,
      r: radius,
      fill: 'none',
      stroke,
      strokeWidth: 5,
      strokeLinecap: left > 0 ? 'round' : 'butt',
      strokeDasharray: `${length * left} ${length}`,
      transform: `rotate(-90 ${size / 2} ${size / 2})`,
    }),
  )

const resetText = (window: LimitWindow, now: number) => (window.resetsAt ? `resets in ${coarseDuration(Math.max(0, window.resetsAt - now))}` : '')

const resetLine = (window: LimitWindow, now: Sig<number>) =>
  dynamicChild(
    derive(() => [resetText(window, now.get()), paceOf(window, now.get()) === 'ahead'] as const),
    ([reset, ahead]) =>
      span(
        { class: 'text-neutral-500 tabular-nums' },
        reset,
        reset && ahead ? ' · ' : '',
        ahead ? span({ class: 'text-warning-400' }, 'ahead of pace') : null,
      ),
  )

export const gauge = (window: LimitWindow, stroke: string, now: Sig<number>) => {
  const left = leftOf(window)
  return div(
    { class: 'flex items-center gap-3', title: window.resetsAt ? `${percent(left)} left · resets ${exactTime(window.resetsAt)}` : `${percent(left)} left` },
    ring(left, stroke, window.label),
    div(
      { class: 'flex flex-col text-xs' },
      span({ class: 'flex items-center gap-2 text-neutral-500' }, window.label, statusBadge(window.status)),
      span({ class: 'text-lg font-semibold text-neutral-100 tabular-nums' }, `${percent(left)} left`),
      resetLine(window, now),
    ),
  )
}
