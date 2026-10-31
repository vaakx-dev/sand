import type { IconName, Tone } from '@sand/ui-kit/contract'
import type { PullRef, PullState } from '../contract'

export interface PullStateLook {
  tone: Tone
  icon: IconName
  label: string
  short?: string
}

const looks: Record<PullState, PullStateLook> = {
  open: { tone: 'success', icon: 'pull-request', label: 'Open' },
  draft: { tone: 'neutral', icon: 'pr-draft', label: 'Draft', short: 'draft' },
  merged: { tone: 'accent', icon: 'merge', label: 'Merged', short: 'merged' },
  closed: { tone: 'neutral', icon: 'pr-closed', label: 'Closed', short: 'closed' },
}

export const pullStateLook = (state: PullState) => looks[state]

export const isLivePull = (state: PullState) => state === 'open' || state === 'draft'

export const pullName = ({ number }: Pick<PullRef, 'number'>) => `#${number}`

export const pullRef = ({ repo, number }: PullRef): PullRef => ({ repo, number })
