import { request, type } from '@sand/host-hub/contract'
import { event, service } from 'drydock'
import { z } from 'zod'

export type PullState = 'open' | 'draft' | 'merged' | 'closed'

export interface PullRef {
  repo: string
  number: number
}

export interface GitHub {
  rest<T>(method: string, path: string, body?: unknown): Promise<T>
  changes(pull: PullRef, signal: AbortSignal): AsyncIterable<void>
}

export const github = service<GitHub>('github')

export interface Pull {
  number: number
  title: string
  state: PullState
  url: string
}

const pullUrl = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/(\d+)/

export const pullRefOf = (url: string): PullRef | undefined => {
  const match = pullUrl.exec(url)
  return match?.[1] && match[2] ? { repo: match[1], number: Number(match[2]) } : undefined
}

export const pullOpened = event<(session: string, pull: Pull) => void>('github.pull.opened')

export const githubPulls = request('github.pulls', {
  input: () => z.object({ cwd: z.string() }),
  output: type<Pull[] | null>(),
  place: 'thread',
})

export const githubOpenPull = request('github.openPull', {
  input: () => z.object({ cwd: z.string(), title: z.string().trim().min(1) }),
  output: type<Pull>(),
  place: 'thread',
})

export { type Check, type CheckState, readChecks } from './checks/read'
