import type { DiffLine } from './line'

export interface SplitPair {
  left?: number
  right?: number
}

export const splitPairs = (lines: DiffLine[]) => {
  const pairs: SplitPair[] = []
  let removed: number[] = []
  let added: number[] = []
  const flush = () => {
    const count = Math.max(removed.length, added.length)
    for (let index = 0; index < count; index++) pairs.push({ left: removed[index], right: added[index] })
    removed = []
    added = []
  }
  lines.forEach((line, index) => {
    if (line.kind === 'del') {
      if (added.length) flush()
      removed.push(index)
    } else if (line.kind === 'add') added.push(index)
    else {
      flush()
      pairs.push({ left: index, right: index })
    }
  })
  flush()
  return pairs
}
