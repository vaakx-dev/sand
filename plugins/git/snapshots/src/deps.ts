import type { Session, Sessions } from '@sand/chats/contract'
import type { GitRepo, GitRunner } from '@sand/git/contract'

export interface SnapshotDeps {
  git: GitRunner
  repos: GitRepo
  sessions: Sessions
  queue: <T>(root: string, task: () => Promise<T>) => Promise<T>
  busyIn(root: string): boolean
  changed(session: Session): void
  refresh(cwd: string): void
}
