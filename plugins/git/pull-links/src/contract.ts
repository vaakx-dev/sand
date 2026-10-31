import type { PullRef, PullSummary } from '@sand/github/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'

export type LinkSource = 'created' | 'branch' | 'linked' | 'opened'

export interface PullLink extends PullRef {
  source: LinkSource
  linked: number
  watching: boolean
  summary?: PullSummary
}

export interface ThreadPulls {
  session: string
  links: PullLink[]
}

const session = z.string()
const ref = z.object({ repo: z.string(), number: z.number().int().positive() })

export const pullLinks = request('pulls.links', { input: z.object({ session }), output: type<ThreadPulls>() })
export const pullLinksAll = request('pulls.links.all', { input: z.object({}), output: type<ThreadPulls[]>() })
export const pullLink = request('pulls.link', { input: z.object({ session, ref: z.string() }), output: type<ThreadPulls>() })
export const pullUnlink = request('pulls.unlink', { input: z.object({ session, pull: ref }), output: type<ThreadPulls>() })
export const pullWatch = request('pulls.watch', { input: z.object({ session, pull: ref, on: z.boolean() }), output: type<ThreadPulls>() })
export const pullOpen = request('pulls.open', {
  input: z.object({ cwd: z.string(), ref: z.string(), mode: z.enum(['worktree', 'checkout']) }),
  output: type<{ session: string }>(),
  place: 'thread',
})

export const threadPullsChange = wireEvent<ThreadPulls>('pulls.thread')

export interface PullLinks {
  links(session: string): Promise<ThreadPulls>
  link(session: string, pull: PullRef, source: LinkSource): Promise<ThreadPulls>
}

export const pullLinksService = service<PullLinks>('pullLinks')
