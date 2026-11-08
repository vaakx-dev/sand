import type { GitRunner } from '@sand/git-runner/contract'
import { lstat, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { IgnoredFiles } from '../contract'

const most = 1000

const inRepo = async (git: GitRunner, folder: string) => (await git.maybe(folder, ['rev-parse', '--is-inside-work-tree'], { read: true })) === 'true'

const listed = async (git: GitRunner, folder: string, flags: string[]) =>
  (await git.output(folder, ['ls-files', '-z', ...flags], { read: true })).split('\0').filter(Boolean)

export const ignoredFiles = async (git: GitRunner | undefined, folder: string): Promise<IgnoredFiles> => {
  if (!git || !(await inRepo(git, folder))) return { files: [], folders: [], truncated: false }
  const paths = await listed(git, folder, ['--others', '--ignored', '--exclude-standard', '--directory'])
  const folders = paths.filter(path => path.endsWith('/'))
  const files = paths.filter(path => !path.endsWith('/'))
  const sized = await Promise.all(files.slice(0, most).map(async path => ({ path, size: (await lstat(join(folder, path))).size })))
  return { files: sized, folders: folders.slice(0, most).map(path => path.slice(0, -1)), truncated: files.length > most || folders.length > most }
}

export const keptPaths = async (git: GitRunner | undefined, folder: string) => {
  const hasGit = await stat(join(folder, '.git')).then(
    () => true,
    () => false,
  )
  if (!git) {
    if (hasGit) throw new Error("The PC with the files can't tell which files git ignores, because the Git runner plugin is off there. Turn it on, or clone instead.")
    return undefined
  }
  if (!(await inRepo(git, folder))) return undefined
  const paths = await listed(git, folder, ['--cached', '--others', '--exclude-standard'])
  return hasGit ? ['.git', ...paths] : paths
}
