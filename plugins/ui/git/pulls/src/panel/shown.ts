import type { PullLink } from '@sand/pull-links/contract'
import type { PullPlace } from '../contract'
import type { PullParts } from '../parts'
import type { DetailState } from './state'

export interface Shown {
  parts: PullParts
  link: PullLink
  at: PullPlace
  state: DetailState
}

export const pullUrl = ({ link }: Shown) => link.summary?.url ?? `https://github.com/${link.repo}/pull/${link.number}`
