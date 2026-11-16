import { percent } from '@sand/util'
import type { PoolState } from '@sand/usage/contract'
import { div, span, type Child } from '@vaakx-dev/vrui'
import { TONE_FILL, TONE_TEXT, type Tone } from '../../look'

export interface BarProps {
  label: string
  state: PoolState
  tone: Tone
  when: string
}

const paceTick = (pace?: number) =>
  pace === undefined || pace >= 1 ? null : span({ class: 'absolute bottom-0 h-2 -translate-x-1/2 rounded-t-sm bg-neutral-100', title: 'Even pace', style: { left: `${pace * 100}%`, width: '2px' } })

const leftText = (state: PoolState, tone: Tone) => (tone === 'out' ? 'Out' : `${percent(state.left)} left`)

export const limitBar = ({ label, state, tone, when }: BarProps, ...below: Child[]) =>
  div(
    { class: 'flex min-w-0 flex-1 flex-col gap-1' },
    div(
      {
        class: 'relative h-8 min-w-0 overflow-hidden rounded-md bg-neutral-800',
        role: 'meter',
        'aria-label': label,
        'aria-valuenow': Math.round(state.left * 100),
        'aria-valuemin': 0,
        'aria-valuemax': 100,
      },
      div({ class: ['absolute inset-y-0 left-0 rounded-md', TONE_FILL[tone]], style: { width: `${(tone === 'out' ? 1 : state.left) * 100}%` } }),
      paceTick(state.pace),
      div(
        { class: 'relative flex h-full items-center gap-1.5 px-2 text-xs whitespace-nowrap tabular-nums' },
        span({ class: ['font-medium', TONE_TEXT[tone]] }, leftText(state, tone)),
        span({ class: 'ml-auto hidden truncate pl-2 text-neutral-400 sm:inline' }, when),
      ),
    ),
    span({ class: 'truncate px-2 text-xs text-neutral-500 tabular-nums sm:hidden' }, when),
    ...below,
  )
