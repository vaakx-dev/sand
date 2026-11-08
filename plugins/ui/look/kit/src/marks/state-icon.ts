import { read, span, type MaybeReactive } from '@vaakx-dev/vrui'
import { icon, type IconName } from '../icons/lucide'
import { spinner } from './marks'

export type WorkState = 'running' | 'waiting' | 'ready' | 'settled' | 'idle'

const glyphs: Record<Exclude<WorkState, 'running'>, IconName> = {
  waiting: 'working',
  ready: 'circle-dot',
  settled: 'circle-check',
  idle: 'circle',
}

const labels: Record<WorkState, string> = { running: 'Running', waiting: 'Waiting', ready: 'Ready', settled: 'Settled', idle: 'Idle' }

export const stateIcon = (state: WorkState, size: 'sm' | 'md' = 'sm', attention: MaybeReactive<boolean> = false) =>
  span(
    { role: 'img', 'aria-label': labels[state], class: ['inline-flex shrink-0', () => (read(attention) ? 'text-neutral-100' : 'text-neutral-400')] },
    state === 'running' ? spinner(size) : icon(glyphs[state], size),
  )
