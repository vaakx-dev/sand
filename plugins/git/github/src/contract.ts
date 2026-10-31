import { type InputOf, request, type, wireEvent } from '@sand/host-hub/contract'
import { type Dispose, event, service } from 'drydock'
import { z } from 'zod'

export type GitHubAuth =
  | { state: 'signed-in'; login: string; host: string; from: 'gh' | 'env' }
  | { state: 'signed-out'; gh: boolean }
  | { state: 'error'; message: string }

export interface GitHubLoginCode {
  code: string
  url: string
}

export type PullState = 'open' | 'draft' | 'merged' | 'closed'
export type ChecksState = 'pass' | 'fail' | 'pending' | 'none'
export type ReviewState = 'approved' | 'changes' | 'required' | 'none'
export type MergeState = 'clean' | 'conflict' | 'behind' | 'blocked' | 'unknown'
export type MergeMethod = 'squash' | 'merge' | 'rebase'

export interface PullRef {
  repo: string
  number: number
}

export interface PullChecks {
  state: ChecksState
  passed: number
  failed: number
  pending: number
}

export type CheckItemState = 'pass' | 'fail' | 'pending' | 'skip'

export interface CheckItem {
  name: string
  state: CheckItemState
  url?: string
  seconds?: number
}

export interface PullSummary extends PullRef {
  title: string
  url: string
  state: PullState
  head: string
  base: string
  author: string
  updated: number
  add: number
  del: number
  files: number
  checks: PullChecks
  checkList: CheckItem[]
  review: ReviewState
  merge: MergeState
  unresolved: number
  autoMerge?: MergeMethod
}

export interface PullText {
  title: string
  body: string
}

const pullRef = z.object({ repo: z.string(), number: z.number().int().positive() })

export const githubAuth = request('github.auth', { input: z.object({}), output: type<GitHubAuth>(), place: 'thread' })
export const githubLogin = request('github.login', { input: z.object({}), output: type<GitHubAuth>(), place: 'thread' })
export const githubLogout = request('github.logout', { input: z.object({}), output: type<GitHubAuth>(), place: 'thread' })
export const githubLoginCode = wireEvent<GitHubLoginCode>('github.login.code')
export const githubAuthChange = wireEvent<GitHubAuth>('github.auth.change')

export const githubRepo = request('github.repo', { input: z.object({ cwd: z.string() }), output: type<{ repo: string } | null>(), place: 'thread' })

export const pullsForBranch = request('pulls.branch', { input: z.object({ cwd: z.string() }), output: type<PullSummary | null>(), place: 'thread' })
export const pullsSummary = request('pulls.summary', { input: pullRef.extend({ fresh: z.boolean().optional() }), output: type<PullSummary>(), place: 'thread' })
export const pullsResolve = request('pulls.resolve', { input: z.object({ cwd: z.string(), ref: z.string() }), output: type<PullSummary>(), place: 'thread' })
export const pullsText = request('pulls.text', {
  input: z.object({ cwd: z.string(), base: z.string().optional(), session: z.string().optional() }),
  output: type<PullText>(),
  place: 'thread',
})
export const pullsCreate = request('pulls.create', {
  input: z.object({ cwd: z.string(), title: z.string().min(1), body: z.string(), base: z.string().optional(), draft: z.boolean().optional(), session: z.string().optional() }),
  output: type<PullSummary>(),
  place: 'thread',
})
export const pullsMerge = request('pulls.merge', {
  input: pullRef.extend({ method: z.enum(['squash', 'merge', 'rebase']), auto: z.boolean().optional() }),
  output: type<PullSummary>(),
  place: 'thread',
})
export const pullsReady = request('pulls.ready', { input: pullRef.extend({ ready: z.boolean() }), output: type<PullSummary>(), place: 'thread' })

export const pullsChange = wireEvent<PullSummary>('pulls.change')

export const authChanged = event<(auth: GitHubAuth) => void>('github.auth.changed')
export const pullChanged = event<(summary: PullSummary) => void>('github.pull.changed')
export const pullCreated = event<(summary: PullSummary, session?: string) => void>('github.pull.created')

export interface GitHub {
  auth(): Promise<GitHubAuth>
  summary(ref: PullRef, fresh?: boolean): Promise<PullSummary>
  noteSummary(id: string, summary: PullSummary): void
  forBranch(cwd: string): Promise<PullSummary | null>
  resolve(cwd: string, ref: string): Promise<PullSummary>
  graphql<T>(query: string, variables: Record<string, unknown>): Promise<T>
  rest<T>(method: string, path: string, body?: unknown): Promise<T>
}

export const github = service<GitHub>('github')

export interface GitHubClient {
  auth(device: string): Promise<GitHubAuth>
  login(device: string): Promise<GitHubAuth>
  logout(device: string): Promise<GitHubAuth>
  repo(input: InputOf<typeof githubRepo>, device: string): Promise<{ repo: string } | null>
  forBranch(input: InputOf<typeof pullsForBranch>, device: string): Promise<PullSummary | null>
  summary(input: InputOf<typeof pullsSummary>, device: string): Promise<PullSummary>
  resolve(input: InputOf<typeof pullsResolve>, device: string): Promise<PullSummary>
  text(input: InputOf<typeof pullsText>, device: string): Promise<PullText>
  create(input: InputOf<typeof pullsCreate>, device: string): Promise<PullSummary>
  merge(input: InputOf<typeof pullsMerge>, device: string): Promise<PullSummary>
  ready(input: InputOf<typeof pullsReady>, device: string): Promise<PullSummary>
  onAuthChange(listener: (auth: GitHubAuth, device: string) => void): Dispose
  onLoginCode(listener: (code: GitHubLoginCode, device: string) => void): Dispose
  onPullChange(listener: (summary: PullSummary, device: string) => void): Dispose
}

export const githubClient = service<GitHubClient>('githubClient')
