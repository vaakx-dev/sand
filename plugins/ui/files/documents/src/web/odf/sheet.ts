import { attribute, descendants, qualified } from '../xml'
import { repeat } from './text'

interface SheetCell {
  text: string
  number: boolean
}

interface Sheet {
  name: string
  rows: SheetCell[][]
  columns: number
  truncated: boolean
}

const MAX_ROWS = 1_000
const MAX_COLUMNS = 60
const MAX_CELL_LENGTH = 1_000
const MAX_SHEET_LENGTH = 4_000_000
const MAX_SHEETS = 100
const NUMBER_TYPES = new Set(['float', 'percentage', 'currency'])
const EMPTY: SheetCell = { text: '', number: false }
const CELLS = new Set(['table:table-cell', 'table:covered-table-cell'])

const inlineText = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replace(/\s+/g, ' ')
  if (!(node instanceof Element)) return ''
  switch (qualified(node)) {
    case 'office:annotation':
      return ''
    case 'text:s':
      return ' '.repeat(repeat(attribute(node, 'text', 'c'), MAX_CELL_LENGTH))
    case 'text:tab':
      return '\t'
    case 'text:line-break':
      return '\n'
    default:
      return [...node.childNodes].map(inlineText).join('')
  }
}

const clipped = (text: string) => (text.length > MAX_CELL_LENGTH ? `${text.slice(0, MAX_CELL_LENGTH)}…` : text)

const cellOf = (cell: Element): SheetCell => {
  if (qualified(cell) === 'table:covered-table-cell') return EMPTY
  const paragraphs = [...cell.children].filter(child => qualified(child) === 'text:p').map(inlineText)
  const text = paragraphs.join('\n') || (attribute(cell, 'office', 'value') ?? '')
  return { text: clipped(text), number: NUMBER_TYPES.has(attribute(cell, 'office', 'value-type') ?? '') }
}

const isCell = (node: Element) => CELLS.has(qualified(node))

const trimmed = (cells: SheetCell[]) => cells.slice(0, cells.findLastIndex(cell => cell.text !== '') + 1)

const rowCells = (row: Element) => {
  const cells: SheetCell[] = []
  let truncated = false
  for (const element of [...row.children].filter(isCell)) {
    const cell = cellOf(element)
    const count = repeat(attribute(element, 'table', 'number-columns-repeated'), MAX_COLUMNS + 1)
    if (cell.text && cells.length + count > MAX_COLUMNS) truncated = true
    cells.push(...Array<SheetCell>(Math.max(0, Math.min(count, MAX_COLUMNS - cells.length))).fill(cell))
  }
  return { cells: trimmed(cells), truncated }
}

const textLength = (cells: SheetCell[]) => cells.reduce((total, cell) => total + cell.text.length, 0)

const sheetOf = (table: Element, index: number): Sheet => {
  const rows: SheetCell[][] = []
  let truncated = false
  let gap = 0
  let length = 0
  for (const row of descendants(table, 'table', 'table-row')) {
    const read = rowCells(row)
    truncated ||= read.truncated
    const count = repeat(attribute(row, 'table', 'number-rows-repeated'), MAX_ROWS + 1)
    if (!read.cells.length) {
      gap = Math.min(gap + count, MAX_ROWS)
      continue
    }
    const room = Math.min(MAX_ROWS - rows.length - gap, Math.floor((MAX_SHEET_LENGTH - length) / Math.max(1, textLength(read.cells))))
    if (room < count) truncated = true
    if (room <= 0) break
    rows.push(...Array<SheetCell[]>(gap).fill([]), ...Array<SheetCell[]>(Math.min(count, room)).fill(read.cells))
    length += textLength(read.cells) * Math.min(count, room)
    gap = 0
  }
  const columns = Math.max(1, ...rows.map(cells => cells.length))
  return { name: attribute(table, 'table', 'name') || `Sheet ${index + 1}`, rows, columns, truncated }
}

const sheetsOf = (content: Document) => {
  const tables = descendants(content, 'table', 'table')
  if (!tables.length) throw new Error('it has no sheets')
  return tables.slice(0, MAX_SHEETS).map(sheetOf)
}

export { MAX_COLUMNS, MAX_ROWS, sheetsOf, type Sheet, type SheetCell }
