import type { Derive } from '@vaakx-dev/vrui'
import { type Dispose, service } from 'drydock'
import type { GitPlace, PlaceStatus } from './places'
import type { GitBranches, GitStatus } from './status'

export interface GitStatusClient {
  current: Derive<PlaceStatus | undefined>
  follow(place: GitPlace, onChange: (status: GitStatus | undefined) => void): Dispose
  status(place: GitPlace): Promise<GitStatus>
  rewatch(place: GitPlace): void
  branches(place: GitPlace, query?: string, limit?: number): Promise<GitBranches>
}

export const gitStatusClient = service<GitStatusClient>('gitStatus')
