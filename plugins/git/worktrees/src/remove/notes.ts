import type { WorktreeRecord } from '../records/schema'

const branchPart = (branch?: string) => (branch ? ` (branch ${branch})` : '')

export const removedNote = (record: WorktreeRecord, branch: string | undefined, cwd: string) =>
  `The worktree at ${record.path}${branchPart(branch)} was removed. This thread now works in the main checkout at ${cwd}, which has its own branch checked out. Work and run commands there from now on.`

export const keptNote = (record: WorktreeRecord, cwd: string) =>
  `Removing the worktree at ${record.path} failed, so this thread is back in ${cwd}. Work and run commands there.`

export const restoredNote = (record: WorktreeRecord, cwd: string) =>
  `The worktree at ${record.path}${branchPart(record.branch)} was restored. This thread works in ${cwd} again; run commands there from now on.`

export const parkedNote = (record: WorktreeRecord, branch: string | undefined, cwd: string) =>
  `This thread was settled, so sand removed its worktree at ${record.path}${branchPart(branch)} to save disk space and parked the thread in the main checkout at ${cwd}. Sand restores the worktree when the thread continues.`

export const notRestoredNote = (record: WorktreeRecord, cwd: string, reason: string) =>
  `Sand couldn't restore this thread's worktree at ${record.path}: ${reason}. This thread is still in the main checkout at ${cwd}, which has its own branch checked out.`
