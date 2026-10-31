import type { DiffFile, DiffList } from '@sand/git-diff/contract'
import type { GitFile, GitRepoLocal } from '@sand/git/contract'

const statusFile = ({ path, from, kind, staged, unstaged, add, del }: GitFile) => [path, from, kind, staged, unstaged, add, del]

export const statusPrint = (local: GitRepoLocal) =>
  JSON.stringify([local.head, local.branch, local.fileCount, local.add, local.del, local.files.map(statusFile)])

const filePrint = ({ from, kind, add, del, binary }: DiffFile) => JSON.stringify([from, kind, add, del, binary])

export const changedPaths = (before: DiffList, after: DiffList, dirty: Iterable<string>) => {
  const old = new Map(before.files.map(file => [file.path, filePrint(file)]))
  const changed = new Set(dirty)
  for (const file of after.files) if (old.get(file.path) !== filePrint(file)) changed.add(file.path)
  return changed
}
