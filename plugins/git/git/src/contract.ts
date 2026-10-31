import { request, type, wireEvent } from '@sand/host-hub/contract'
import { type Dispose, service } from 'drydock'
import { z } from 'zod'

export type GitFailure = 'not-a-repo' | 'not-found' | 'rejected' | 'no-upstream' | 'conflict' | 'hook' | 'auth' | 'locked' | 'dirty' | 'unknown'

export interface GitResult {
  code: number
  out: string
  err: string
}

export interface GitOptions {
  env?: Record<string, string | undefined>
  input?: string
  timeoutMs?: number
  read?: boolean
  onLine?: (line: string) => void
}

export interface GitLines {
  code: number
  lines: string[]
}

export interface GitProblem {
  reason: GitFailure
  message: string
  detail?: string
}

export interface GitRunner {
  run(cwd: string, args: string[], options?: GitOptions): Promise<GitResult>
  ok(cwd: string, args: string[], options?: GitOptions): Promise<string>
  maybe(cwd: string, args: string[], options?: GitOptions): Promise<string | undefined>
  lines(cwd: string, args: string[], max: number, options?: GitOptions): Promise<GitLines>
  classify(result: GitResult, args: string[]): GitProblem
  problem(error: unknown): GitProblem | undefined
  remoteUrl(folder: string): Promise<string | undefined>
}

export const gitRunner = service<GitRunner>('git')

export type FileKind = 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked' | 'conflicted'

export interface GitFile {
  path: string
  from?: string
  kind: FileKind
  staged: boolean
  unstaged: boolean
  add: number
  del: number
  binary?: boolean
}

export interface GitRepoLocal {
  repo: true
  root: string
  prefix: string
  main: string
  worktree: boolean
  branch?: string
  head?: string
  detached: boolean
  defaultBranch?: string
  isDefault: boolean
  files: GitFile[]
  fileCount: number
  truncated?: boolean
  add: number
  del: number
}

export type GitLocal = GitRepoLocal | { repo: false }

export interface GitRemote {
  remote?: string
  upstream?: string
  ahead: number
  behind: number
  base?: string
  behindBase: number
  aheadBase: number
  fetchedAt?: number
  fetchError?: string
}

export interface GitStatus {
  cwd: string
  local: GitLocal
  remote?: GitRemote
}

export interface GitBranch {
  name: string
  remote?: string
  current: boolean
  isDefault: boolean
  worktree?: string
  updated: number
}

export interface GitBranches {
  branches: GitBranch[]
  total: number
}

const cwdInput = z.object({ cwd: z.string() })

export const gitStatus = request('git.status', { input: cwdInput, output: type<GitStatus>(), place: 'thread' })
export const gitWatch = request('git.watch', { input: cwdInput, output: type<GitStatus>(), place: 'thread' })
export const gitBranches = request('git.branches', {
  input: z.object({ cwd: z.string(), query: z.string().optional(), limit: z.number().int().positive().optional() }),
  output: type<GitBranches>(),
  place: 'thread',
})

export const gitLocalChange = wireEvent<{ cwd: string; local: GitLocal }>('git.local')
export const gitRemoteChange = wireEvent<{ cwd: string; remote: GitRemote }>('git.remote')

export interface GitRepo {
  status(cwd: string): Promise<GitStatus>
  local(cwd: string): Promise<GitLocal>
  branches(cwd: string, query?: string, limit?: number): Promise<GitBranches>
  refresh(cwd: string): Promise<void>
  fetch(cwd: string): Promise<void>
}

export const gitRepo = service<GitRepo>('gitRepo')

export interface GitPlace {
  cwd: string
  device: string
}

export interface GitStatusClient {
  follow(place: GitPlace, onChange: (status: GitStatus | undefined) => void): Dispose
  current(place: GitPlace): GitStatus | undefined
  refresh(place: GitPlace): Promise<void>
}

export const gitStatusClient = service<GitStatusClient>('gitStatus')
