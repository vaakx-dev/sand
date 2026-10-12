import { inline } from '../inline'
import { formulaAt } from '../math/inline'
import { tableBlock, tableCell, type Align } from '../nodes'
import type { Scope } from '../scope'

const delimiterRow = /^ {0,3}\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/

const splitRow = (line: string, scope: Scope) => {
  let row = line.trim()
  if (row.startsWith('|')) row = row.slice(1)
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1)
  const cells: string[] = []
  let cell = ''
  let code = false
  for (let index = 0; index < row.length; index++) {
    const char = row[index]!
    const next = row[index + 1] ?? ''
    const formula = code ? undefined : formulaAt(row, index, scope)
    if (formula) {
      cell += row.slice(index, formula.end).replaceAll('\\|', '|')
      index = formula.end - 1
    } else if (char === '\\' && next === '|') {
      cell += next
      index++
    } else if (char === '\\' && !code) {
      cell += char + next
      index++
    } else if (char === '|' && !code) {
      cells.push(cell.trim())
      cell = ''
    } else {
      if (char === '`') code = !code
      cell += char
    }
  }
  cells.push(cell.trim())
  return cells
}

export const isTableStart = (lines: string[], index: number, scope: Scope) => {
  const head = lines[index]
  const divider = lines[index + 1]
  if (!head?.includes('|') || !divider?.includes('|') || !delimiterRow.test(divider)) return false
  return splitRow(head, scope).length === splitRow(divider, scope).length
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
  const aligns = splitRow(lines[start + 1]!, scope).map(alignment)
  const head = row(splitRow(lines[start]!, scope), aligns, true, scope)
  const rows: HTMLElement[][] = []
  let index = start + 2
  while (index < lines.length && lines[index]!.trim() && lines[index]!.includes('|')) rows.push(row(splitRow(lines[index++]!, scope), aligns, false, scope))
  return { node: tableBlock(head, rows), next: index }
}
