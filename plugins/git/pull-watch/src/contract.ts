import { request, type, wireEvent } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { z } from 'zod'

export interface FollowedPull {
  id: string
  thread: string
  repo: string
  number: number
  url: string
  title: string
  changed?: number
  error?: string
}

export const PULL_NOTICE = 'pull'

const callers = 'any'

const one = lazy(() => z.object({ thread: z.string().min(1) }))

const pull = lazy(() => z.string().trim().min(1).describe('The pull request, as its URL or owner/name#number'))

export const pullFollowsChangeWire = wireEvent<[thread: string, pulls: FollowedPull[]]>('pull.follows.change')

export const pullFollows = request('pull.follows', { input: one, output: type<FollowedPull[]>(), callers })
export const pullFollow = request('pull.follow', { input: () => one().extend({ pull: pull() }), output: type<FollowedPull>(), callers })
export const pullUnfollow = request('pull.unfollow', { input: () => one().extend({ pull: pull() }), output: type<boolean>(), callers })
