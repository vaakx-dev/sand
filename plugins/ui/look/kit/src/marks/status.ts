import { badge, type Tone } from './marks'

export type RunStatus = 'running' | 'done' | 'failed' | 'cancelled' | 'stopped'

export const runLooks: Record<RunStatus, { label: string; tone: Tone }> = {
  running: { label: 'Running', tone: 'run' },
  done: { label: 'Done', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  cancelled: { label: 'Stopped', tone: 'neutral' },
  stopped: { label: 'Stopped', tone: 'neutral' },
}

export const statusLabel = (status: RunStatus) => runLooks[status].label

export const statusBadge = (status: RunStatus) => badge(runLooks[status].tone, runLooks[status].label)
