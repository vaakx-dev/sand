import { isFolder } from '@sand/kit/fs'
import type { SyncInspect } from '../contract'
import { join } from 'node:path'
import type { Hidden } from '../folder/hidden'
import { blockedReason } from '../folder/paths'
import { isGitFolder } from '../folder/stat'
import { git } from '../git/run'
import { folderTree, treeSizes } from '../snapshot/tree'
import { branchOf, remotesOf } from '../transfer/remotes'
import { diskBytes } from './disk'
import { findSecrets } from './secrets'
import { suggestedSetup } from './setup'
import { skippedEntries } from './skipped'

const dirtyCount = async (folder: string) => {
  const status = await git(['status', '--porcelain=v1', '-z', '--no-renames'], { cwd: folder })
  return status.out.split('\0').filter(Boolean).length
}

const blockedInspect = (path: string, blocked: string): SyncInspect => ({ path, git: false, files: 0, bytes: 0, historyBytes: 0, dirty: 0, skipped: [], secrets: [], remotes: {}, blocked })

export const inspectFolder = async (hidden: Hidden, sandHome: string): Promise<SyncInspect> => {
  const folder = hidden.folder
  if (!(await isFolder(folder))) throw new Error(`${folder} is not a folder`)
  const blocked = await blockedReason(folder, sandHome)
  if (blocked) return blockedInspect(folder, blocked)
  const isGit = await isGitFolder(folder)
  const tree = await folderTree(hidden)
  const [sizes, skipped, secrets, setup, remotes, branch, historyBytes, dirty] = await Promise.all([
    treeSizes(hidden, tree),
    skippedEntries(hidden),
    findSecrets(folder),
    suggestedSetup(folder),
    isGit ? remotesOf(folder) : {},
    isGit ? branchOf(folder) : undefined,
    isGit ? diskBytes(join(folder, '.git')) : 0,
    isGit ? dirtyCount(folder) : 0,
  ])
  return { path: folder, git: isGit, branch, ...sizes, historyBytes, dirty, skipped, secrets, remotes, setup }
}
