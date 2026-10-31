import type { DiffHunk, DiffPatch } from '@sand/git-diff/contract'
import type { DiffLine } from './line'
import { splitPairs, type SplitPair } from './split'
import { emphasize } from './words'

export interface PatchRows {
  lines: DiffLine[]
  pairs: SplitPair[]
}

const hunkTitle = ({ header, oldStart, oldLines, newStart, newLines }: DiffHunk) =>
  header.startsWith('@@') ? header : `@@ -${oldStart},${oldLines} +${newStart},${newLines} @@${header ? ` ${header}` : ''}`

const hunkLines = (hunk: DiffHunk, out: DiffLine[]) => {
  out.push({ kind: 'gap', text: hunkTitle(hunk) })
  let old = hunk.oldStart
  let next = hunk.newStart
  let removed: DiffLine[] = []
  let added: DiffLine[] = []
  const flush = () => {
    emphasize(removed, added)
    for (const line of removed) out.push(line)
    for (const line of added) out.push(line)
    removed = []
    added = []
  }
  for (const raw of hunk.lines) {
    const mark = raw[0]
    const text = raw.slice(1)
    if (mark === '\\') continue
    if (mark === '-') {
      if (added.length) flush()
      removed.push({ kind: 'del', text, old: old++ })
    } else if (mark === '+') added.push({ kind: 'add', text, new: next++ })
    else {
      flush()
      out.push({ kind: 'ctx', text, old: old++, new: next++ })
    }
  }
  flush()
}

export const patchRows = (patch: DiffPatch): PatchRows => {
  const lines: DiffLine[] = []
  for (const hunk of patch.hunks) hunkLines(hunk, lines)
  return { lines, pairs: splitPairs(lines) }
}
