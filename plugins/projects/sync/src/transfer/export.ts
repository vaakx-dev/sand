import type { SyncExport } from '../contract'
import { rm } from 'node:fs/promises'
import { requireSettled } from '../conflicts/settle'
import { hiddenGit, hiddenOut, type Hidden } from '../folder/hidden'
import { isGitFolder } from '../folder/stat'
import { git, gitOut } from '../git/run'
import { snapshot } from '../snapshot/snapshot'
import { hasCommit } from '../snapshot/tree'
import { branchOf, remotesOf } from './remotes'
import type { Transfers } from './transfers'

const exportRef = 'refs/sync/export'

const known = async (hidden: Hidden, ids: string[]) => {
  const present = await Promise.all(ids.map(id => hasCommit(hidden, id)))
  return ids.filter((_, index) => present[index])
}

export const exportSnapshot = async (hidden: Hidden, have: string[], transfers: Transfers): Promise<SyncExport> => {
  await requireSettled(hidden)
  const commit = await snapshot(hidden)
  await hiddenOut(hidden, ['update-ref', exportRef, commit])
  const file = await transfers.reserve()
  const excluded = (await known(hidden, have)).map(id => `^${id}`)
  const bundled = await hiddenGit(hidden, ['bundle', 'create', file, exportRef, ...excluded])
  if (bundled.code !== 0) await hiddenOut(hidden, ['bundle', 'create', file, exportRef])
  return { ...transfers.offer(file), commit }
}

export const exportHistory = async (folder: string, transfers: Transfers): Promise<SyncExport> => {
  if (!(await isGitFolder(folder))) throw new Error(`${folder} is not a git repository`)
  const file = await transfers.reserve()
  const bundled = await git(['bundle', 'create', file, '--branches', '--tags'], { cwd: folder })
  if (bundled.code !== 0) {
    await rm(file, { force: true })
    await gitOut(['rev-parse', '--git-dir'], { cwd: folder })
    await Bun.write(file, '')
  }
  return { ...transfers.offer(file), branch: await branchOf(folder), remotes: await remotesOf(folder) }
}
