import type { GitPlace, GitStatus } from '../contract'

export type StatusListener = (status: GitStatus | undefined) => void

export interface Followed {
  place: GitPlace
  listeners: Set<StatusListener>
  status?: GitStatus
  version: number
  stopRenewal: () => void
}

export const placeKey = ({ device, cwd }: GitPlace) => `${device}\n${cwd}`

export const withLocal = (status: GitStatus | undefined, change: Pick<GitStatus, 'cwd' | 'local'>): GitStatus =>
  change.local.repo ? { ...status, ...change } : change

export const withRemote = (status: GitStatus | undefined, remote: GitStatus['remote']): GitStatus | undefined =>
  status?.local.repo ? { ...status, remote } : undefined
