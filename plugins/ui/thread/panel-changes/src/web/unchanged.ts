import type { Changes, FileChange } from '../changes/collect'

const same = (was: FileChange, now: FileChange) =>
  was.path === now.path &&
  was.agent === now.agent &&
  was.outside === now.outside &&
  was.hunks.length === now.hunks.length &&
  was.hunks.every((hunk, at) => hunk.lines === now.hunks[at]?.lines && hunk.start === now.hunks[at]?.start)

const sameItems = <T>(was: T[], now: T[]) => was.length === now.length && was.every((item, at) => item === now[at])

export const keepUnchanged = (previous: Changes | undefined, next: Changes): Changes => {
  const before = new Map(previous?.files.map(file => [file.key, file]))
  const files = next.files.map(file => {
    const was = before.get(file.key)
    return was && same(was, file) ? was : file
  })
  if (previous && sameItems(previous.files, files) && sameItems(previous.turns, next.turns)) return previous
  return { ...next, files }
}
