import type { Kit, WorkState } from '@sand/ui-kit/contract'
import type { Status } from '@sand/ui-shell/contract'
import { ago } from '@sand/util'
import { span } from '@vaakx-dev/vrui'
import { urgent } from './work'

const workStates: Record<Status, WorkState> = { waiting: 'waiting', ready: 'ready', merging: 'running', running: 'running', merged: 'settled', done: 'settled' }

export const statusIcon = (kit: Kit, status: Status) => kit.stateIcon(workStates[status], 'sm', urgent(status))

const labels: Partial<Record<Status, { text: string; tone: string }>> = {
  running: { text: 'Working', tone: 'text-info-400' },
  merging: { text: 'Merging', tone: 'text-info-400' },
  waiting: { text: 'Needs you', tone: 'text-warning-400' },
  ready: { text: 'Ready', tone: 'text-success-400' },
}

export const statusLabel = (kit: Kit, status: Status, at: number) => {
  const label = labels[status]
  if (!label) return span({ class: 'tabular-nums' }, ago(at))
  return span({ class: ['flex items-center gap-1.5', label.tone] }, status === 'running' || status === 'merging' ? kit.spinner('xs') : span({ class: 'h-1.5 w-1.5 rounded-full bg-current' }), label.text)
}
