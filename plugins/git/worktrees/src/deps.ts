import type { Sessions } from '@sand/chats/contract'
import type { GitRepo } from '@sand/git/contract'
import type { GitRunner } from '@sand/git-runner/contract'
import type { SubModel } from '@sand/sub-model/contract'
import type { Proposals } from './proposal/proposals'
import type { RecordStore } from './records/store'
import type { Setups } from './setup/setups'

export interface WorktreeDeps {
  git: GitRunner
  repos: GitRepo
  sessions: Sessions
  store: RecordStore
  setups: Setups
  proposals: Proposals
  folder: string
  prefix: string
  queue<T>(main: string, task: () => Promise<T>): Promise<T>
  busy(session: string): boolean
  projectOf(folder: string): string | null
  sub(): SubModel | undefined
  changed(main: string, ...folders: string[]): Promise<void>
  report(error: unknown): void
}
