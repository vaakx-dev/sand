import type { Changes, FileChange } from '../changes/collect'

const same = (was: FileChange, now: FileChange) =>
  was.path === now.path &&
  was.agent === now.agent &&
  was.outside === now.outside &&
  was.hunks.length === now.hunks.length &&
  was.hunks.every((hunk, at) => hunk === now.hunks[at])

export const keepUnchanged = (previous: Changes | undefined, next: Changes): Changes => {
  const before = new Map(previous?.files.map(file => [file.key, file]))
  return {
    ...next,
    files: next.files.map(file => {
      const was = before.get(file.key)
      return was && same(was, file) ? was : file
    }),
  }
}
