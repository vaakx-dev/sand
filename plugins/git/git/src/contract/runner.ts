import { service } from 'drydock'

export type GitFailure = 'not-a-repo' | 'not-found' | 'rejected' | 'no-upstream' | 'conflict' | 'hook' | 'auth' | 'locked' | 'dirty' | 'unknown'

export interface GitResult {
  code: number
  out: string
  err: string
}

export type GitEnv = Record<string, string>

export interface GitOptions {
  env?: Record<string, string | undefined>
  input?: string
  timeoutMs?: number
  read?: boolean
  what?: string
  onLine?: (line: string) => void
}

export interface GitLines {
  code: number
  lines: string[]
  err: string
}

export interface GitProblem {
  reason: GitFailure
  message: string
  detail?: string
}

export interface GitRunner {
  run(cwd: string, args: string[], options?: GitOptions): Promise<GitResult>
  ok(cwd: string, args: string[], options?: GitOptions): Promise<string>
  output(cwd: string, args: string[], options?: GitOptions): Promise<string>
  maybe(cwd: string, args: string[], options?: GitOptions): Promise<string | undefined>
  lines(cwd: string, args: string[], max: number, options?: GitOptions): Promise<GitLines>
  classify(result: GitResult, args: string[], what?: string): GitProblem
  problem(error: unknown): GitProblem | undefined
  remoteUrl(folder: string): Promise<string | undefined>
  withTempIndex<T>(cwd: string, run: (env: GitEnv) => Promise<T>): Promise<T>
}

export const gitRunner = service<GitRunner>('git')
