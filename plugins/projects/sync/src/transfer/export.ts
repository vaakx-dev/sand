import type { SyncExport } from '../contract'
import { rm } from 'node:fs/promises'
import { hiddenGit, hiddenOut, type Hidden } from '../folder/hidden'
import { isGitFolder } from '../folder/stat'
import { git, gitOut } from '../git/run'
import { snapshot } from '../snapshot/snapshot'
import { settle } from '../conflicts/settle'
import { branchOf, remotesOf } from './remotes'
import type { Transfers } from './transfers'

const exportRef = 'refs/sync/export'

const known = async (hidden: Hidden, ids: string[]) => {
  const present = await Promise.all(ids.map(async id => (await hiddenGit(hidden, ['cat-file', '-e', `${id}^{commit}`])).code === 0))
  return ids.filter((_, index) => present[index])
}

export const exportSnapshot = async (hidden: Hidden, have: string[], transfers: Transfers): Promise<SyncExport> => {
  const settled = await settle(hidden)
  if (settled.pending) throw new Error('Resolve the conflicts in this folder first')
  const commit = await snapshot(hidden)
  await hiddenOut(hidden, ['update-ref', exportRef, commit])
  const file = await transfers.reserve('out')
  const excluded = (await known(hidden, have)).map(id => `^${id}`)
  const first = await hiddenGit(hidden, ['bundle', 'create', file, exportRef, ...excluded])
  if (first.code !== 0) await hiddenOut(hidden, ['bundle', 'create', file, exportRef])
  return { ...transfers.offer(file), commit }
}

export const exportHistory = async (folder: string, transfers: Transfers): Promise<SyncExport> => {
  if (!(await isGitFolder(folder))) throw new Error(`${folder} is not a git repository`)
  const file = await transfers.reserve('out')
  const bundled = await git(['bundle', 'create', file, '--branches', '--tags'], { cwd: folder })
  if (bundled.code !== 0) {
    await rm(file, { force: true })
    await gitOut(['rev-parse', '--git-dir'], { cwd: folder })
    await Bun.write(file, '')
  }
  return { ...transfers.offer(file), branch: await branchOf(folder), remotes: await remotesOf(folder) }
}
