import type { Worktree } from '../contract'
import type { WorktreeRecord } from '../records/schema'

export const recordedWorktree = (record: WorktreeRecord, sessions: string[]): Worktree => ({
  path: record.path,
  main: record.main,
  ...(record.branch ? { branch: record.branch } : {}),
  ...(record.base ? { base: record.base } : {}),
  ...(record.head ? { head: record.head } : {}),
  sand: true,
  sessions,
  created: record.created,
  ...(record.removed ? { removed: record.removed } : {}),
})
