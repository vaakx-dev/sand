import type { Status } from '@sand/ui-shell/contract'
import { read, span, type MaybeReactive } from '@vaakx-dev/vrui'
import { icon, type IconName } from '../icons/lucide'
import { spinner } from './marks'
import { toneText, type Tone } from './tones'

export type WorkState = 'running' | 'waiting' | 'ready' | 'merged' | 'settled' | 'failed' | 'idle'

const glyphs: Record<Exclude<WorkState, 'running'>, IconName> = {
  waiting: 'working',
  ready: 'circle-dot',
  merged: 'merge',
  settled: 'circle-check',
  failed: 'circle-x',
  idle: 'circle',
}

const statusStates: Record<Status, WorkState> = { waiting: 'waiting', ready: 'ready', merging: 'running', running: 'running', merged: 'settled', done: 'settled', failed: 'failed', stopped: 'idle' }

const urgent = new Set<Status>(['waiting', 'ready', 'merging'])

const labels: Record<WorkState, string> = { running: 'Running', waiting: 'Waiting', ready: 'Ready', merged: 'Merged', settled: 'Settled', failed: 'Failed', idle: 'Idle' }

export const workTones: Record<WorkState, Tone> = { running: 'run', waiting: 'warning', ready: 'success', merged: 'merged', settled: 'neutral', failed: 'danger', idle: 'neutral' }

const stateColor = (state: WorkState, attention: MaybeReactive<boolean>) => () =>
  workTones[state] === 'neutral' && read(attention) ? 'text-neutral-100' : toneText[workTones[state]]

export const stateIcon = (state: WorkState, size: 'sm' | 'md' = 'sm', attention: MaybeReactive<boolean> = false) =>
  span({ role: 'img', 'aria-label': labels[state], class: ['inline-flex shrink-0', stateColor(state, attention)] }, state === 'running' ? spinner(size) : icon(glyphs[state], size))

export const statusIcon = (status: Status) => stateIcon(statusStates[status], 'sm', urgent.has(status))
