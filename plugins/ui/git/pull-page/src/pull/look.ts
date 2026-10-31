import type { PullState } from '@sand/github/contract'
import type { IconName, Tone } from '@sand/ui-kit/contract'

export interface StateLook {
  tone: Tone
  icon: IconName
  label: string
}

const looks: Record<PullState, StateLook> = {
  open: { tone: 'success', icon: 'pull-request', label: 'Open' },
  draft: { tone: 'neutral', icon: 'pr-draft', label: 'Draft' },
  merged: { tone: 'accent', icon: 'merge', label: 'Merged' },
  closed: { tone: 'danger', icon: 'pr-closed', label: 'Closed' },
}

export const stateLook = (state: PullState) => looks[state]

export const isLive = (state: PullState) => state === 'open' || state === 'draft'

export const pullName = (number: number) => `#${number}`
