import type { SyncImported } from '@sand/protocol'
import { mkdir, readdir } from 'node:fs/promises'
import { hiddenLine, hiddenOut, type Hidden } from '../folder/hidden'
import { exists, isDirectory } from '../folder/stat'
import { git, gitOut } from '../git/run'
import { prepareHidden } from '../snapshot/tree'

const incomingRef = 'refs/sync/incoming'

export const importSnapshot = async (hidden: Hidden, bundle: string | undefined, commit: string | undefined): Promise<SyncImported> => {
  if (!bundle) throw new Error('The transfer had no files')
  await prepareHidden(hidden)
  await hiddenOut(hidden, ['fetch', '--quiet', bundle, `+refs/sync/export:${incomingRef}`], { cwd: hidden.dir })
  const received = await hiddenLine(hidden, ['rev-parse', incomingRef], { cwd: hidden.dir })
  if (commit && commit !== received) throw new Error('The received snapshot does not match')
  return { path: hidden.folder, commit: received }
}

const requireFreshFolder = async (folder: string) => {
  if (!(await exists(folder))) return
  if (!(await isDirectory(folder)) || (await readdir(folder)).length > 0) throw new Error(`${folder} already exists and is not empty`)
}

const firstBranch = async (folder: string) => (await gitOut(['for-each-ref', '--format=%(refname:short)', '--count=1', 'refs/heads'], { cwd: folder })).trim()

export const importHistory = async (folder: string, bundle: string | undefined, branch: string | undefined, remotes: Record<string, string> = {}): Promise<SyncImported> => {
  const names = [branch ?? '', ...Object.entries(remotes).flat()]
  if (names.some(name => name.startsWith('-'))) throw new Error('Invalid branch or remote name')
  await requireFreshFolder(folder)
  await mkdir(folder, { recursive: true })
  await gitOut(['init', '--quiet'], { cwd: folder })
  if (bundle) {
    await gitOut(['fetch', '--quiet', '--update-head-ok', bundle, '+refs/heads/*:refs/heads/*', '+refs/tags/*:refs/tags/*'], { cwd: folder })
    const target = branch ?? (await firstBranch(folder))
    if (target) await gitOut(['checkout', '--quiet', '-f', target], { cwd: folder })
  } else if (branch) {
    await gitOut(['symbolic-ref', 'HEAD', `refs/heads/${branch}`], { cwd: folder })
  }
  for (const [name, url] of Object.entries(remotes)) await git(['remote', 'add', name, url], { cwd: folder })
  return { path: folder }
}
