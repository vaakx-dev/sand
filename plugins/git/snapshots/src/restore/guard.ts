import type { GitRunner } from '@sand/git/contract'
import { lstatSync } from 'node:fs'
import { join } from 'node:path'
import { snapshotFiles, trackedFiles } from '../git/lists'

const onDisk = (root: string, path: string) => lstatSync(join(root, path), { throwIfNoEntry: false })

const foldersOf = (path: string) => {
  const parts = path.split('/')
  return parts.slice(1).map((_, at) => parts.slice(0, at + 1).join('/'))
}

const ignoredAmong = async (git: GitRunner, root: string, paths: string[]) => {
  if (!paths.length) return []
  const args = ['check-ignore', '-z', '--stdin']
  const result = await git.run(root, args, { input: paths.join('\0'), read: true })
  if (result.code > 1) throw new Error(git.classify(result, args).message)
  return result.out.split('\0').filter(Boolean)
}

export const refuseUnmerged = async (git: GitRunner, root: string) => {
  if (await git.ok(root, ['ls-files', '-u'], { read: true })) throw new Error(`Finish or abort the merge in ${root} before restoring files.`)
}

export const ignoredInTheWay = async (git: GitRunner, root: string, commit: string) => {
  const tracked = new Set(await trackedFiles(git, root))
  const incoming = (await snapshotFiles(git, root, commit)).filter(path => !tracked.has(path))
  const present = new Set<string>()
  for (const path of incoming) {
    const found = onDisk(root, path)
    if (found?.isDirectory()) throw new Error(`Restoring would replace the folder ${path}. Move it out of the way first.`)
    if (found) present.add(path)
  }
  const folders = new Set(incoming.flatMap(foldersOf).filter(folder => !tracked.has(folder)))
  for (const folder of folders) {
    const found = onDisk(root, folder)
    if (found && !found.isDirectory()) present.add(folder)
  }
  return ignoredAmong(git, root, [...present])
}
