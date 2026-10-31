import type { PullLink } from '@sand/pull-links/contract'
import { type Dispose, service } from 'drydock'

export interface PullPlace {
  session: string
  cwd: string
  device: string
}

export interface ThreadPullsClient {
  follow(place: PullPlace, onChange: (links: PullLink[]) => void): Dispose
  links(session: string): PullLink[]
  primary(session: string): PullLink | undefined
  canCreate(place: PullPlace): boolean
  create(place: PullPlace): void
  open(link: PullLink, place: PullPlace): void
}

export const threadPullsClient = service<ThreadPullsClient>('threadPulls')
