import type { WorktreeRecord } from '../records/schema'

const branchPart = (branch?: string) => (branch ? ` (branch ${branch})` : '')

export const removedNote = (record: WorktreeRecord, branch: string | undefined, cwd: string) =>
  `The worktree at ${record.path}${branchPart(branch)} was removed. This thread now works in the main checkout at ${cwd}, which has its own branch checked out. Work and run commands there from now on.`

export const keptNote = (record: WorktreeRecord, cwd: string) =>
  `Removing the worktree at ${record.path} failed, so this thread is back in ${cwd}. Work and run commands there.`

export const restoredNote = (record: WorktreeRecord, cwd: string) =>
  `The worktree at ${record.path}${branchPart(record.branch)} was restored. This thread works in ${cwd} again; run commands there from now on.`

export const parkedNote = (record: WorktreeRecord, branch: string | undefined, cwd: string) =>
  `The worktree at ${record.path}${branchPart(branch)} was removed while this thread was idle, and the thread moved to the main checkout at ${cwd}.`

export const notRestoredNote = (record: WorktreeRecord, cwd: string, reason: string) =>
  `Restoring this thread's worktree at ${record.path} failed: ${reason}. This thread is still in the main checkout at ${cwd}, which has its own branch checked out.`
