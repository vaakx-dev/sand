import type { DiffHunk } from '../contract'

export interface ParsedPatch {
  hunks: DiffHunk[]
  binary: boolean
}

const hunkHeader = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/
const binaryNote = /^Binary files .* differ$/

const openHunk = (header: string): DiffHunk | undefined => {
  const match = hunkHeader.exec(header)
  if (!match) return undefined
  const [, oldStart, oldLines, newStart, newLines] = match
  return { oldStart: Number(oldStart), oldLines: Number(oldLines ?? 1), newStart: Number(newStart), newLines: Number(newLines ?? 1), header, lines: [] }
}

const signs = new Set([' ', '+', '-', '\\'])

const readBody = (hunk: DiffHunk, lines: string[], at: number) => {
  let oldLeft = hunk.oldLines
  let newLeft = hunk.newLines
  while (at < lines.length && (oldLeft > 0 || newLeft > 0 || lines[at]?.startsWith('\\'))) {
    const line = lines[at] || ' '
    const sign = line[0] ?? ''
    if (!signs.has(sign)) break
    at++
    if (sign === '-' || sign === ' ') oldLeft--
    if (sign === '+' || sign === ' ') newLeft--
    hunk.lines.push(line)
  }
  return at
}

export const parsePatch = (lines: string[]): ParsedPatch => {
  const hunks: DiffHunk[] = []
  let binary = false
  let at = 0
  while (at < lines.length) {
    const line = lines[at++] ?? ''
    const hunk = line.startsWith('@@') ? openHunk(line) : undefined
    if (hunk) {
      at = readBody(hunk, lines, at)
      hunks.push(hunk)
    } else if (binaryNote.test(line)) binary = true
  }
  return { hunks, binary }
}
