import type { MergeMethod, PullState, PullSummary } from '@sand/github/contract'
import { type InputOf, request, type, wireEvent } from '@sand/host-hub/contract'
import { type Dispose, service } from 'drydock'
import { z } from 'zod'

export type InboxView = 'needs' | 'mine' | 'reviewing' | 'all'
export type InboxGroup = 'turn' | 'ready' | 'waiting' | 'done'
export type ReasonTone = 'danger' | 'warning' | 'accent' | 'success' | 'neutral'

export interface InboxReason {
  group: InboxGroup
  text: string
  tone: ReasonTone
}

export interface InboxPull extends PullSummary {
  reason: InboxReason
  labels: string[]
  methods: MergeMethod[]
  mine: boolean
  reviewRequested: boolean
}

export interface InboxPage {
  viewer: string
  pulls: InboxPull[]
  cursor?: string
  capped?: boolean
}

export interface InboxCount {
  count: number
  viewer?: string
}

export const pullsInbox = request('pulls.inbox', {
  input: z.object({
    view: z.enum(['needs', 'mine', 'reviewing', 'all']),
    state: z.enum(['open', 'merged', 'closed', 'all']).optional(),
    q: z.string().optional(),
    repos: z.array(z.string()).optional(),
    cursor: z.string().optional(),
    fresh: z.boolean().optional(),
  }),
  output: type<InboxPage>(),
})

export const pullsInboxCount = request('pulls.inbox.count', { input: z.object({}), output: type<InboxCount>() })
export const pullsInboxCountChange = wireEvent<InboxCount>('pulls.inbox.count')
export const pullsInboxRow = wireEvent<InboxPull>('pulls.inbox.row')

export interface PullInboxClient {
  page(input: InputOf<typeof pullsInbox>): Promise<InboxPage>
  count(): Promise<InboxCount>
  onCount(listener: (count: InboxCount) => void): Dispose
  onRow(listener: (pull: InboxPull) => void): Dispose
}

export const pullInboxClient = service<PullInboxClient>('pullInboxClient')

export type { PullState }
