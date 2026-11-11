import { request, type } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'

export type PullState = 'open' | 'draft' | 'merged' | 'closed'

export interface GitHub {
  rest<T>(method: string, path: string, body?: unknown): Promise<T>
}

export const github = service<GitHub>('github')

export interface Pull {
  number: number
  title: string
  state: PullState
  url: string
}

export const githubPulls = request('github.pulls', {
  input: z.object({ cwd: z.string() }),
  output: type<Pull[]>(),
  place: 'thread',
})
