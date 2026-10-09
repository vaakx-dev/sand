import type { DiffLine } from '@sand/kit'
import type { FileChange } from './collect'

const maxLines = 600

export const shownLines = (file: FileChange, max = maxLines): DiffLine[] => {
  const lines: DiffLine[] = []
  let shown = 0
  file.hunks.forEach((hunk, index) => {
    if (index > 0 && shown < max) lines.push({ kind: 'gap', text: `edit ${index + 1}` })
    for (const line of hunk) {
      if (shown < max) lines.push(line)
      shown++
    }
  })
  if (shown > max) lines.push({ kind: 'gap', text: `${shown - max} more lines not shown` })
  return lines
}

export const totals = (files: FileChange[]) => ({
  add: files.reduce((sum, file) => sum + file.add, 0),
  del: files.reduce((sum, file) => sum + file.del, 0),
})

export const matchFile = (files: FileChange[], path: string) =>
  files.find(candidate => candidate.path === path || candidate.path.endsWith(`/${path}`) || path.endsWith(`/${candidate.path}`))
