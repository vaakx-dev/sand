import { isFolder } from '@sand/kit/fs'
import { git } from '@sand/kit/git'
import type { SyncInspect } from '../contract'
import { join } from 'node:path'
import { blockedReason } from '../folder/paths'
import { isGitFolder } from '../folder/stat'
import type { SyncedFolder } from '../folder/synced'
import { scanFolder } from '../snapshot/snapshot'
import { branchOf, remotesOf } from '../git/remotes'
import { diskBytes } from './disk'
import { findSecrets } from './secrets'
import { suggestedSetup } from './setup'
import { skippedEntries } from './skipped'

const dirtyCount = async (folder: string) => {
  if (!Bun.which('git')) return 0
  const status = await git(folder, ['status', '--porcelain=v1', '-z', '--no-renames'])
  return status.out.split('\0').filter(Boolean).length
}

const blockedInspect = (path: string, blocked: string): SyncInspect => ({ path, git: false, files: 0, bytes: 0, historyBytes: 0, dirty: 0, skipped: [], secrets: [], remotes: {}, blocked })

export const inspectFolder = async (synced: SyncedFolder, sandHome: string): Promise<SyncInspect> => {
  const { folder } = synced
  if (!(await isFolder(folder))) throw new Error(`${folder} is not a folder`)
  const blocked = await blockedReason(folder, sandHome)
  if (blocked) return blockedInspect(folder, blocked)
  const isGit = await isGitFolder(folder)
  const scan = await scanFolder(synced)
  const [skipped, secrets, setup, remotes, branch, historyBytes, dirty] = await Promise.all([
    skippedEntries(folder, scan.skipped),
    findSecrets(folder),
    suggestedSetup(folder),
    isGit ? remotesOf(folder) : {},
    isGit ? branchOf(folder) : undefined,
    isGit ? diskBytes(join(folder, '.git')) : 0,
    isGit ? dirtyCount(folder) : 0,
  ])
  return { path: folder, git: isGit, branch, files: scan.files, bytes: scan.bytes, historyBytes, dirty, skipped, secrets, remotes, setup }
}
