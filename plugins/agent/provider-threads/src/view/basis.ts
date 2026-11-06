import type { Entry } from '@sand/chats/contract'
import type { Segment } from '../contract'
import { type Path, resetOf } from './path'

export interface Basis {
  segments: Segment[]
  from: number
}

export type Lookup = (id: string) => Entry | undefined

const endOf = (segment: Segment) => {
  if ('entries' in segment) return segment.entries[1]
  return 'summary' in segment ? segment.summary : segment.to
}

export const headOf = (seen: Segment[]) => {
  const last = seen.at(-1)
  return last ? endOf(last) : null
}

export const onPath = (seen: Segment[], path: Path) => {
  const head = headOf(seen)
  return head === null || path.index.has(head)
}

const summaryBasis = (path: Path, at: number): Basis => {
  const entry = path.entries[at]!
  const keep = resetOf(path, entry)?.keep
  const kept = keep ? path.index.get(keep) : undefined
  return { segments: [{ summary: entry.id }], from: kept ?? at + 1 }
}

export const fullBasis = (path: Path): Basis => {
  const at = path.entries.findLastIndex(entry => resetOf(path, entry))
  return at < 0 ? { segments: [], from: 0 } : summaryBasis(path, at)
}

const ancestorOnPath = (path: Path, lookup: Lookup, id: string) => {
  for (let entry = lookup(id); entry; entry = entry.parent ? lookup(entry.parent) : undefined) if (path.index.has(entry.id)) return entry.id
  return undefined
}

const cut = (segment: Segment, path: Path, lookup: Lookup): Segment | undefined => {
  if (!('entries' in segment) || !path.index.has(segment.entries[0])) return undefined
  const to = ancestorOnPath(path, lookup, segment.entries[1])
  return to ? { entries: [segment.entries[0], to] } : undefined
}

const trim = (seen: Segment[], path: Path, lookup: Lookup) => {
  const kept: Segment[] = []
  for (const segment of seen) {
    if (path.index.has(endOf(segment))) {
      kept.push(segment)
      continue
    }
    const part = cut(segment, path, lookup)
    if (part) kept.push(part)
    break
  }
  return kept
}

const ownReset = (thread: string, path: Path, from: number) => path.entries.findLastIndex((entry, at) => at >= from && resetOf(path, entry)?.thread === thread)

export const compactedSince = (thread: string, seen: Segment[], path: Path) => {
  const head = headOf(seen)
  const at = head === null ? -1 : path.index.get(head)
  return at !== undefined && ownReset(thread, path, at + 1) >= 0
}

export const threadBasis = (thread: string, seen: Segment[], path: Path, lookup: Lookup): Basis => {
  const segments = onPath(seen, path) ? seen : trim(seen, path, lookup)
  const head = headOf(segments)
  const from = head === null ? 0 : path.index.get(head)! + 1
  const own = ownReset(thread, path, from)
  return own < 0 ? { segments, from } : summaryBasis(path, own)
}

export const covered = ({ segments, from }: Basis, path: Path): Segment[] => {
  const head = path.entries.at(-1)
  if (!head || from >= path.entries.length) return segments
  const last = segments.at(-1)
  if (last && 'entries' in last) return [...segments.slice(0, -1), { entries: [last.entries[0], head.id] }]
  return [...segments, { entries: [path.entries[from]!.id, head.id] }]
}

export const extended = (seen: Segment[], reply: string): Segment[] => {
  const last = seen.at(-1)
  if (last && 'entries' in last) return [...seen.slice(0, -1), { entries: [last.entries[0], reply] }]
  return [...seen, { entries: [reply, reply] }]
}
