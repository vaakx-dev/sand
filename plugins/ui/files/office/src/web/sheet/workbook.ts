import { format, getFormatFromId, isDateFormat } from 'numfmt'
import type { Archive } from '../archive'
import { child, children, mainPart, numberAttribute, partXml, path, relatedOfType, relationId, relationships } from '../xml'

type Align = 'left' | 'center' | 'right'

interface Style {
  pattern: string
  align?: Align
  bold: boolean
  italic: boolean
  wrap: boolean
}

interface Cell {
  text: string
  align: Align
  bold: boolean
  italic: boolean
  wrap: boolean
}

interface Range {
  top: number
  left: number
  bottom: number
  right: number
}

interface Sheet {
  cells: Map<number, Map<number, Cell>>
  rows: number[]
  columns: number[]
  frozen: { rows: number; columns: number }
  merges: Range[]
  clipped: boolean
}

interface SheetEntry {
  name: string
  part: string
}

interface Book {
  strings: string[]
  styles: Style[]
  date1904: boolean
}

const MAX_CELLS = 500_000
const MAX_ROWS = 200_000
const MAX_COLUMNS = 16_384
const DEFAULT_COLUMN_PX = 64
const DEFAULT_ROW_POINTS = 15
const CHARACTER_PX = 7
const POINT_PX = 4 / 3
const DAYS_1900_TO_1904 = 1462

const ALIGNMENTS: Record<string, Align> = { left: 'left', justify: 'left', fill: 'left', center: 'center', centerContinuous: 'center', distributed: 'center', right: 'right' }

const GENERAL = 'General'

const plainText = (node: Element | undefined) => [...children(node, 't'), ...children(node, 'r').flatMap(run => children(run, 't'))].map(found => found.textContent ?? '').join('')

const sharedStrings = async (archive: Archive, part: string | undefined) => (part && archive.has(part) ? children(await partXml(archive, part), 'si').map(plainText) : [])

const truthy = (node: Element | undefined, name: string) => {
  const value = node?.getAttribute(name)
  return value === '1' || value === 'true'
}

const flag = (node: Element | undefined, name: string) => {
  const found = child(node, name)
  const value = found?.getAttribute('val')
  return Boolean(found) && value !== '0' && value !== 'false'
}

const fontLooks = (fonts: Element[]) => fonts.map(font => ({ bold: flag(font, 'b'), italic: flag(font, 'i') }))

const patternOf = (id: number, custom: Map<number, string>) => custom.get(id) ?? getFormatFromId(id) ?? GENERAL

const stylesOf = async (archive: Archive, part: string | undefined): Promise<Style[]> => {
  if (!part || !archive.has(part)) return []
  const root = await partXml(archive, part)
  const custom = new Map(children(child(root, 'numFmts'), 'numFmt').map(found => [numberAttribute(found, 'numFmtId') ?? -1, found.getAttribute('formatCode') ?? GENERAL]))
  const fonts = fontLooks(children(child(root, 'fonts'), 'font'))
  return children(child(root, 'cellXfs'), 'xf').map(xf => {
    const alignment = child(xf, 'alignment')
    const font = fonts[numberAttribute(xf, 'fontId') ?? 0]
    return {
      pattern: patternOf(numberAttribute(xf, 'numFmtId') ?? 0, custom),
      align: ALIGNMENTS[alignment?.getAttribute('horizontal') ?? ''],
      bold: font?.bold ?? false,
      italic: font?.italic ?? false,
      wrap: truthy(alignment, 'wrapText'),
    }
  })
}

const coordinate = (reference: string) => {
  const match = /^\$?([A-Z]{1,3})\$?(\d{1,7})$/i.exec(reference)
  if (!match) return undefined
  const column = [...match[1]!.toUpperCase()].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1
  return { row: Number(match[2]) - 1, column }
}

const rangeOf = (reference: string): Range | undefined => {
  const [from = '', to = from] = reference.split(':')
  const first = coordinate(from)
  const last = coordinate(to)
  if (!first || !last) return undefined
  const top = Math.min(first.row, last.row)
  const left = Math.min(first.column, last.column)
  if (top >= MAX_ROWS || left >= MAX_COLUMNS) return undefined
  return { top, left, bottom: Math.min(MAX_ROWS - 1, Math.max(first.row, last.row)), right: Math.min(MAX_COLUMNS - 1, Math.max(first.column, last.column)) }
}

const valueOf = (cell: Element, book: Book) => {
  const type = cell.getAttribute('t') ?? 'n'
  const raw = child(cell, 'v')?.textContent ?? ''
  switch (type) {
    case 's':
      return book.strings[Number(raw)] ?? ''
    case 'inlineStr':
      return plainText(child(cell, 'is'))
    case 'str':
      return raw
    case 'b':
      return raw === '1'
    case 'e':
      return { error: raw }
    case 'd':
      return raw ? new Date(raw) : ''
    default:
      return raw === '' ? '' : Number(raw)
  }
}

const serial = (value: number, pattern: string, book: Book) => (book.date1904 && isDateFormat(pattern) ? value + DAYS_1900_TO_1904 : value)

const formatted = (value: ReturnType<typeof valueOf>, pattern: string, book: Book) => {
  if (typeof value === 'object' && 'error' in value) return value.error
  const shown = typeof value === 'number' ? serial(value, pattern, book) : value
  return format(pattern, shown, { throws: false })
}

const defaultAlign = (value: ReturnType<typeof valueOf>): Align => {
  if (typeof value === 'number' || value instanceof Date) return 'right'
  if (typeof value === 'boolean' || typeof value === 'object') return 'center'
  return 'left'
}

const cellOf = (cell: Element, book: Book): Cell | undefined => {
  const value = valueOf(cell, book)
  const style = book.styles[numberAttribute(cell, 's') ?? 0]
  const text = formatted(value, style?.pattern ?? GENERAL, book)
  if (text === '') return undefined
  return { text, align: style?.align ?? defaultAlign(value), bold: style?.bold ?? false, italic: style?.italic ?? false, wrap: style?.wrap ?? false }
}

const sizes = (count: number, fallback: number, custom: Map<number, number>) => Array.from({ length: count }, (_, index) => custom.get(index) ?? fallback)

const columnWidths = (root: Element, count: number) => {
  const defaultWidth = numberAttribute(child(root, 'sheetFormatPr'), 'defaultColWidth')
  const fallback = defaultWidth ? Math.round(defaultWidth * CHARACTER_PX) : DEFAULT_COLUMN_PX
  const custom = new Map<number, number>()
  children(child(root, 'cols'), 'col').forEach(column => {
    const first = Math.max(1, numberAttribute(column, 'min') ?? 1) - 1
    const last = Math.min(count, numberAttribute(column, 'max') ?? first + 1)
    const width = truthy(column, 'hidden') ? 0 : Math.round((numberAttribute(column, 'width') ?? fallback / CHARACTER_PX) * CHARACTER_PX)
    for (let index = first; index < last; index++) custom.set(index, width)
  })
  return sizes(count, fallback, custom)
}

const frozenOf = (root: Element) => {
  const pane = child(path(root, 'sheetViews', 'sheetView'), 'pane')
  const state = pane?.getAttribute('state')
  if (state !== 'frozen' && state !== 'frozenSplit') return { rows: 0, columns: 0 }
  return { rows: Math.max(0, Math.floor(numberAttribute(pane, 'ySplit') ?? 0)), columns: Math.max(0, Math.floor(numberAttribute(pane, 'xSplit') ?? 0)) }
}

const largest = (values: Iterable<number>) => {
  let found = -1
  for (const value of values) found = Math.max(found, value)
  return found
}

const extent = (cells: Map<number, Map<number, Cell>>, merges: Range[]) => {
  const rows = Math.max(largest(cells.keys()), largest(merges.map(merge => merge.bottom))) + 1
  const columns = Math.max(largest([...cells.values()].map(row => largest(row.keys()))), largest(merges.map(merge => merge.right))) + 1
  return { rows, columns }
}

const readCells = (root: Element, book: Book) => {
  const cells = new Map<number, Map<number, Cell>>()
  const heights = new Map<number, number>()
  let count = 0
  let clipped = false
  let rowIndex = -1
  rows: for (const row of children(child(root, 'sheetData'), 'row')) {
    rowIndex = (numberAttribute(row, 'r') ?? rowIndex + 2) - 1
    if (rowIndex >= MAX_ROWS) {
      clipped = true
      break
    }
    const height = numberAttribute(row, 'ht')
    if (truthy(row, 'hidden')) heights.set(rowIndex, 0)
    else if (height !== undefined) heights.set(rowIndex, Math.round(height * POINT_PX))
    let columnIndex = -1
    const shown = new Map<number, Cell>()
    for (const cell of children(row, 'c')) {
      columnIndex = coordinate(cell.getAttribute('r') ?? '')?.column ?? columnIndex + 1
      if (columnIndex >= MAX_COLUMNS) {
        clipped = true
        continue
      }
      const value = cellOf(cell, book)
      if (!value) continue
      if (count >= MAX_CELLS) {
        clipped = true
        break rows
      }
      count += 1
      shown.set(columnIndex, value)
    }
    if (shown.size > 0) cells.set(rowIndex, shown)
  }
  return { cells, heights, clipped }
}

const sheetOf = async (archive: Archive, part: string, book: Book): Promise<Sheet> => {
  const root = await partXml(archive, part)
  const { cells, heights, clipped } = readCells(root, book)
  const merges = children(child(root, 'mergeCells'), 'mergeCell').flatMap(merge => rangeOf(merge.getAttribute('ref') ?? '') ?? [])
  const size = extent(cells, merges)
  const defaultRow = Math.round((numberAttribute(child(root, 'sheetFormatPr'), 'defaultRowHeight') ?? DEFAULT_ROW_POINTS) * POINT_PX)
  const frozen = frozenOf(root)
  return {
    cells,
    rows: sizes(size.rows, defaultRow, heights),
    columns: columnWidths(root, size.columns),
    frozen: { rows: Math.min(frozen.rows, size.rows), columns: Math.min(frozen.columns, size.columns) },
    merges,
    clipped,
  }
}

const workbookOf = async (archive: Archive) => {
  const part = (await mainPart(archive)) ?? 'xl/workbook.xml'
  const [root, related] = await Promise.all([partXml(archive, part), relationships(archive, part)])
  const [strings, styles] = await Promise.all([sharedStrings(archive, relatedOfType(related, 'sharedStrings')), stylesOf(archive, relatedOfType(related, 'styles'))])
  const book: Book = { strings, styles, date1904: truthy(child(root, 'workbookPr'), 'date1904') }
  const sheets: SheetEntry[] = children(child(root, 'sheets'), 'sheet')
    .filter(sheet => (sheet.getAttribute('state') ?? 'visible') === 'visible')
    .flatMap(sheet => {
      const target = related.get(relationId(sheet) ?? '')
      return target?.type === 'worksheet' ? [{ name: sheet.getAttribute('name') ?? 'Sheet', part: target.target }] : []
    })
  return { sheets, sheet: (entry: SheetEntry) => sheetOf(archive, entry.part, book) }
}

type Workbook = Awaited<ReturnType<typeof workbookOf>>

export { workbookOf, type Align, type Cell, type Range, type Sheet, type SheetEntry, type Workbook }
