import type { GitRunner } from '@sand/git/contract'

export const listPaths = async (git: GitRunner, root: string, args: string[]) => {
  const result = await git.run(root, args, { read: true })
  if (result.code !== 0) throw new Error(git.classify(result, args).message)
  return result.out.split('\0').filter(Boolean)
}

const blobPath = (record: string) => {
  const tab = record.indexOf('\t')
  return record.slice(0, tab).split(' ')[1] === 'blob' ? [record.slice(tab + 1)] : []
}

export const snapshotFiles = async (git: GitRunner, root: string, commit: string) =>
  (await listPaths(git, root, ['ls-tree', '-r', '-z', `${commit}^{tree}`])).flatMap(blobPath)

export const trackedFiles = (git: GitRunner, root: string) => listPaths(git, root, ['ls-files', '-z'])

export const untrackedFiles = async (git: GitRunner, root: string) =>
  (await listPaths(git, root, ['ls-files', '--others', '--exclude-standard', '-z'])).filter(path => !path.endsWith('/'))
