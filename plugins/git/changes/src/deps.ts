import type { Sessions } from '@sand/chats/contract'
import type { GitRepo } from '@sand/git/contract'
import type { GitDiffs } from '@sand/git-diff/contract'
import type { GitRunner } from '@sand/git-runner/contract'
import type { ThreadChanges } from './contract'
import type { Merged } from './merged'

export type Attempt = { state: 'merging' } | { state: 'failed'; reason: string }

export interface ChangesDeps {
  git: GitRunner
  repos: GitRepo
  diffs: GitDiffs
  sessions: Sessions
  merged: Merged
  attempts: Map<string, Attempt>
  busy(session: string): boolean
  settle(session: string): Promise<void>
  queue<T>(main: string, task: () => Promise<T>): Promise<T>
  changed(session: string): Promise<ThreadChanges>
  report(error: unknown): void
}
