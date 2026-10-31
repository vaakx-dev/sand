import type { PullDetail } from '../contract'
import { pullLabel } from '../pulls/ref'

export const isOpen = (detail: PullDetail) => detail.state === 'open' || detail.state === 'draft'

export const stateNote = (detail: PullDetail) => `${pullLabel(detail)} is ${detail.state}`
