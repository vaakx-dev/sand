import type { Row, SplitRow } from './rows'
import type { Selected } from './view'

const blockSize = 16

export const blocksOf = (rows: (Row | SplitRow)[]) =>
  Array.from({ length: Math.ceil(rows.length / blockSize) }, (_, index) => rows.slice(index * blockSize, (index + 1) * blockSize))

const atsOf = (row: Row | SplitRow) => {
  if (row.type === 'line') return [row.line.at]
  if (row.type === 'pair') return row.pair.flatMap(line => (line ? [line.at] : []))
  return []
}

export const selectionKey = (rows: (Row | SplitRow)[]) => {
  const ats = rows.flatMap(atsOf)
  const first = Math.min(...ats)
  const last = Math.max(...ats)
  return (selected: Selected | undefined) => {
    if (!selected || selected.to < first || selected.from > last) return ''
    if (selected.to <= last) return `${selected.from}-${selected.to}`
    return `${Math.max(selected.from, first)}-${last}`
  }
}
