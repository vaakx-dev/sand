import { inline } from '../inline'
import { tableBlock, tableCell, type Align } from '../nodes'
import type { Scope } from '../scope'

const delimiterRow = /^ {0,3}\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/

const splitRow = (line: string) => {
  let row = line.trim()
  if (row.startsWith('|')) row = row.slice(1)
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1)
  const cells: string[] = []
  let cell = ''
  let code = false
  for (let index = 0; index < row.length; index++) {
    const char = row[index]!
    if (char === '\\' && row[index + 1] === '|') {
      cell += '|'
      index++
      continue
    }
    if (char === '`') code = !code
    if (char === '|' && !code) {
      cells.push(cell.trim())
      cell = ''
      continue
    }
    cell += char
  }
  cells.push(cell.trim())
  return cells
}

export const isTableStart = (lines: string[], index: number) => {
  const head = lines[index]
  const divider = lines[index + 1]
  if (!head?.includes('|') || !divider?.includes('|') || !delimiterRow.test(divider)) return false
  return splitRow(head).length === splitRow(divider).length
}

const alignment = (cell: string): Align | undefined => {
  const left = cell.startsWith(':')
  const right = cell.endsWith(':')
  if (left && right) return 'center'
  if (right) return 'right'
  return left ? 'left' : undefined
}

const row = (cells: string[], aligns: (Align | undefined)[], head: boolean, scope: Scope) =>
  aligns.map((align, index) => tableCell(head, align, inline(cells[index] ?? '', scope)))

export const parseTable = (lines: string[], start: number, scope: Scope) => {
  const aligns = splitRow(lines[start + 1]!).map(alignment)
  const head = row(splitRow(lines[start]!), aligns, true, scope)
  const rows: HTMLElement[][] = []
  let index = start + 2
  while (index < lines.length && lines[index]!.trim() && lines[index]!.includes('|')) rows.push(row(splitRow(lines[index++]!), aligns, false, scope))
  return { node: tableBlock(head, rows), next: index }
}
