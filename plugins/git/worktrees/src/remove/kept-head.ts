import type { GitRunner } from '@sand/git/contract'
import type { WorktreeRecord } from '../records/schema'
import { refExists } from '../repo/refs'
import { gitStep } from '../repo/run'

export const keptHeadRef = (record: WorktreeRecord) => `refs/sand/removed/${record.id}`

export const keepHead = (git: GitRunner, record: WorktreeRecord, head: string) =>
  gitStep(git, record.main, ['update-ref', keptHeadRef(record), head], "Couldn't keep the worktree's last commit safe, so it stays")

export const keptHead = async (git: GitRunner, record: WorktreeRecord) => {
  if (await refExists(git, record.main, keptHeadRef(record))) return keptHeadRef(record)
  return record.head && (await refExists(git, record.main, record.head)) ? record.head : undefined
}

export const dropKeptHead = (git: GitRunner, record: WorktreeRecord) =>
  gitStep(git, record.main, ['update-ref', '-d', keptHeadRef(record)], `Couldn't delete ${keptHeadRef(record)}`)
