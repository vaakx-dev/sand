import { isFolder } from '@sand/kit/fs'
import { git, gitOk } from '@sand/kit/git'
import type { Transfers } from '@sand/transfers/contract'
import type { SyncExport, SyncImported } from '../contract'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { exists, isGitFolder } from '../folder/stat'
import { branchOf, remotesOf } from './remotes'

const hasGit = () => Bun.which('git') !== null

const bundleHistory = async (folder: string, file: string) => {
  if (!hasGit()) return false
  if ((await git(folder, ['bundle', 'create', file, '--branches', '--tags'])).code === 0) return true
  await gitOk(folder, ['rev-parse', '--git-dir'])
  return false
}

export const exportHistory = async (folder: string, transfers: Transfers): Promise<SyncExport> => {
  if (!(await isGitFolder(folder))) throw new Error(`${folder} is not a git repository`)
  const file = await transfers.reserve()
  if (!(await bundleHistory(folder, file))) {
    await rm(file, { force: true })
    await Bun.write(file, '')
  }
  return { ...transfers.offer(file), branch: await branchOf(folder), remotes: await remotesOf(folder) }
}

const requireFreshFolder = async (folder: string) => {
  if (!(await exists(folder))) return
  if (!(await isFolder(folder)) || (await readdir(folder)).length > 0) throw new Error(`${folder} already exists and is not empty`)
}

const firstBranch = (folder: string) => gitOk(folder, ['for-each-ref', '--format=%(refname:short)', '--count=1', 'refs/heads'])

const restoreHistory = async (folder: string, bundle: string | undefined, branch: string | undefined, remotes: Record<string, string>) => {
  await gitOk(folder, ['init', '--quiet'])
  if (bundle) {
    await gitOk(folder, ['fetch', '--quiet', '--update-head-ok', bundle, '+refs/heads/*:refs/heads/*', '+refs/tags/*:refs/tags/*'])
    const target = branch ?? (await firstBranch(folder))
    if (target) await gitOk(folder, ['checkout', '--quiet', '-f', target])
  } else if (branch) {
    await gitOk(folder, ['symbolic-ref', 'HEAD', `refs/heads/${branch}`])
  }
  for (const [name, url] of Object.entries(remotes)) await git(folder, ['remote', 'add', name, url])
}

export const importHistory = async (folder: string, bundle: string | undefined, branch: string | undefined, remotes: Record<string, string> = {}): Promise<SyncImported> => {
  const names = [branch ?? '', ...Object.entries(remotes).flat()]
  if (names.some(name => name.startsWith('-'))) throw new Error('Invalid branch or remote name')
  await requireFreshFolder(folder)
  await mkdir(folder, { recursive: true })
  if (hasGit()) await restoreHistory(folder, bundle, branch, remotes)
  return { path: folder }
}
