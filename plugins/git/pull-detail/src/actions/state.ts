import { pullLabel } from '@sand/github/contract'
import type { PullDetail } from '../contract'

export const isOpen = (detail: PullDetail) => detail.state === 'open' || detail.state === 'draft'

export const stateNote = (detail: PullDetail) => `${pullLabel(detail)} is ${detail.state}`
