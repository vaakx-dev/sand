import type { FileKind } from '@sand/git/contract'
import type { DiffFile } from '../contract'

const kinds: Record<string, FileKind> = { A: 'added', C: 'added', D: 'deleted', R: 'renamed', U: 'conflicted' }

const readRaw = (head: string, records: string[], at: number, files: Map<string, DiffFile>) => {
  const letter = head[head.lastIndexOf(' ') + 1] ?? ''
  const paired = letter === 'R' || letter === 'C'
  const first = records[at] ?? ''
  const path = paired ? (records[at + 1] ?? '') : first
  if (!files.has(path)) files.set(path, { path, kind: kinds[letter] ?? 'modified', add: 0, del: 0, ...(letter === 'R' ? { from: first } : {}) })
  return at + (paired ? 2 : 1)
}

const readCount = (head: string, records: string[], at: number, files: Map<string, DiffFile>) => {
  const first = head.indexOf('\t')
  const second = head.indexOf('\t', first + 1)
  if (first < 0 || second < 0) return at
  const inline = head.slice(second + 1)
  const path = inline || (records[at + 1] ?? '')
  const added = head.slice(0, first)
  const file = files.get(path) ?? { path, kind: 'modified' as const, add: 0, del: 0 }
  files.set(path, added === '-' ? { ...file, binary: true } : { ...file, add: Number(added), del: Number(head.slice(first + 1, second)) })
  return inline ? at : at + 2
}

export const parseChanges = (out: string): DiffFile[] => {
  const records = out.split('\0')
  const files = new Map<string, DiffFile>()
  let at = 0
  while (at < records.length) {
    const head = records[at++]
    if (!head) continue
    at = head.startsWith(':') ? readRaw(head, records, at, files) : readCount(head, records, at, files)
  }
  return [...files.values()]
}
