import type { LimitWindow } from '@sand/accounts/contract'
import { leftOf, percent } from '@sand/util'
import { div, span } from '@vaakx-dev/vrui'
import type { Forecast } from '../../data/forecast/project'
import { accountName, type Share } from '../../data/plans'
import { elapsedOf, TONE_FILL, TONE_TEXT, type Tone, toneOf } from '../../look'
import { whenText } from './pace'

export interface Segment extends Share {
  forecast?: Forecast
}

const resetText = (window: LimitWindow, tone: Tone) => {
  if (!window.resetsAt) return 'not started'
  return tone === 'out' ? `back ${whenText(window.resetsAt)}` : whenText(window.resetsAt)
}

const paceTick = (window: LimitWindow, now: number) => {
  const elapsed = elapsedOf(window, now)
  if (elapsed === undefined) return null
  return span({ class: 'absolute bottom-0 h-2 -translate-x-1/2 rounded-t-sm bg-neutral-100', title: 'Even pace', style: { left: `${(1 - elapsed) * 100}%`, width: '2px' } })
}

const segmentView = ({ account, window, forecast }: Segment, named: boolean, now: number) => {
  const tone = toneOf(window, now, forecast?.outAt)
  const left = leftOf(window)
  return div(
    {
      class: 'relative h-8 min-w-0 flex-1 overflow-hidden rounded-md bg-neutral-800',
      role: 'meter',
      'aria-label': named ? `${window.label} on ${accountName(account)}` : window.label,
      'aria-valuenow': Math.round(left * 100),
      'aria-valuemin': 0,
      'aria-valuemax': 100,
    },
    div({ class: ['absolute inset-y-0 left-0 rounded-md', TONE_FILL[tone]], style: { width: `${(tone === 'out' ? 1 : left) * 100}%` } }),
    paceTick(window, now),
    div(
      { class: 'relative flex h-full items-center gap-1.5 px-2 text-xs whitespace-nowrap tabular-nums' },
      named ? span({ class: 'truncate text-neutral-200' }, accountName(account)) : null,
      span({ class: ['font-medium', TONE_TEXT[tone]] }, tone === 'out' ? 'Out' : percent(left)),
      span({ class: 'ml-auto hidden truncate pl-2 text-neutral-400 sm:inline' }, resetText(window, tone)),
    ),
  )
}

const phoneResets = (segments: Segment[], now: number) =>
  div(
    { class: 'flex w-full gap-1 sm:hidden' },
    segments.map(({ window, forecast }) => span({ class: 'min-w-0 flex-1 truncate px-2 text-xs text-neutral-500 tabular-nums' }, resetText(window, toneOf(window, now, forecast?.outAt)))),
  )

export const limitBar = (segments: Segment[], now: number) =>
  div(
    { class: 'flex min-w-0 flex-1 flex-col gap-1' },
    div({ class: 'flex w-full gap-1' }, segments.map(segment => segmentView(segment, segments.length > 1, now))),
    phoneResets(segments, now),
  )
