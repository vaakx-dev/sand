import { badge, type Tone } from './marks'

export type RunStatus = 'running' | 'done' | 'failed' | 'cancelled' | 'stopped'

const statuses: Record<RunStatus, { label: string; tone: Tone }> = {
  running: { label: 'Running', tone: 'neutral' },
  done: { label: 'Done', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  cancelled: { label: 'Stopped', tone: 'neutral' },
  stopped: { label: 'Stopped', tone: 'neutral' },
}

export const statusLabel = (status: RunStatus) => statuses[status].label

export const statusBadge = (status: RunStatus) => badge(statuses[status].tone, statuses[status].label)
