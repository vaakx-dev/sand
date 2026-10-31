import type { Ask } from '@sand/ask/contract'
import type { Sessions } from '@sand/chats/contract'
import type { GitRepo, GitRunner } from '@sand/git/contract'
import type { RecordStore } from './records/store'
import type { Setups } from './setup/setups'

export interface WorktreeDeps {
  git: GitRunner
  repos: GitRepo
  sessions: Sessions
  store: RecordStore
  setups: Setups
  folder: string
  prefix: string
  queue<T>(main: string, task: () => Promise<T>): Promise<T>
  busy(session: string): boolean
  projectOf(folder: string): string | null
  ask(): Ask | undefined
  changed(main: string, ...folders: string[]): Promise<void>
  report(error: unknown): void
}
