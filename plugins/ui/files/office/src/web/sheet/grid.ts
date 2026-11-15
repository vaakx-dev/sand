import { derive, div, dynamicChild, resizeObserver, sig } from '@vaakx-dev/vrui'
import { Axis } from './axis'
import type { Align, Cell, Range, Sheet } from './workbook'

interface Span {
  first: number
  end: number
}

interface Area {
  rows: Span
  columns: Span
  x: number
  y: number
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface Track {
  shown: Span
  whole: Span
  origin: number
  frozen: boolean
}

interface Layout {
  sheet: Sheet
  rows: Axis
  columns: Axis
  frozenRows: number
  frozenColumns: number
  numberWidth: number
  top: number
  left: number
}

const HEADER_PX = 20
const ROW_CHUNK = 32
const COLUMN_CHUNK = 8
const OVERFLOW_COLUMNS = 8
const MAX_FROZEN_PX = 200
const DIGIT_PX = 7
const NUMBER_PADDING_PX = 16

const ALIGN_LOOKS: Record<Align, string> = { left: 'text-left', center: 'text-center', right: 'text-right' }

const px = (value: number) => `${value}px`

const letters = (index: number): string => (index < 26 ? '' : letters(Math.floor(index / 26) - 1)) + String.fromCharCode(65 + (index % 26))

const counted = (span: Span) => Array.from({ length: Math.max(0, span.end - span.first) }, (_, offset) => span.first + offset)

const frozenWithin = (axis: Axis, count: number) => counted({ first: 0, end: count + 1 }).findLast(kept => axis.start(kept) <= MAX_FROZEN_PX) ?? 0

const layoutOf = (sheet: Sheet): Layout => {
  const rows = new Axis(sheet.rows)
  const columns = new Axis(sheet.columns)
  const frozenRows = frozenWithin(rows, sheet.frozen.rows)
  const frozenColumns = frozenWithin(columns, sheet.frozen.columns)
  const numberWidth = String(rows.count).length * DIGIT_PX + NUMBER_PADDING_PX
  return { sheet, rows, columns, frozenRows, frozenColumns, numberWidth, top: HEADER_PX + rows.start(frozenRows), left: numberWidth + columns.start(frozenColumns) }
}

const spanAt = (axis: Axis, frozen: number, scrolled: number, viewport: number, chunk: number): Span => {
  const base = axis.start(frozen)
  const first = axis.at(base + scrolled)
  const last = axis.at(base + scrolled + viewport)
  return { first: Math.max(frozen, (Math.floor(first / chunk) - 1) * chunk), end: Math.min(axis.count, (Math.ceil((last + 1) / chunk) + 1) * chunk) }
}

const box = (rect: Rect) => ({ left: px(rect.x), top: px(rect.y), width: px(rect.width), height: px(rect.height) })

const framed = (rect: Rect) => box({ x: rect.x - 1, y: rect.y - 1, width: rect.width + 1, height: rect.height + 1 })

const rectOf = (layout: Layout, area: Area, range: Range): Rect => ({
  x: layout.columns.start(range.left) - area.x,
  y: layout.rows.start(range.top) - area.y,
  width: layout.columns.start(range.right + 1) - layout.columns.start(range.left),
  height: layout.rows.start(range.bottom + 1) - layout.rows.start(range.top),
})

const cellBox = (layout: Layout, area: Area, range: Range, cell: Cell | undefined) =>
  div(
    {
      class: [
        'absolute overflow-hidden border border-neutral-700 bg-neutral-950 px-1 pt-px text-xs leading-4 text-neutral-100',
        cell?.wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-nowrap',
        ALIGN_LOOKS[cell?.align ?? 'left'],
        cell?.bold && 'font-semibold',
        cell?.italic && 'italic',
      ],
      style: framed(rectOf(layout, area, range)),
    },
    cell?.text ?? '',
  )

const within = (range: Range, row: number, column: number) => row >= range.top && row <= range.bottom && column >= range.left && column <= range.right

const piecesIn = (layout: Layout, area: Area, bounds: Range) =>
  layout.sheet.merges.flatMap(merge => {
    const piece = { top: Math.max(merge.top, bounds.top), left: Math.max(merge.left, bounds.left), bottom: Math.min(merge.bottom, bounds.bottom), right: Math.min(merge.right, bounds.right) }
    const shown = piece.top <= piece.bottom && piece.left <= piece.right && piece.bottom >= area.rows.first && piece.top < area.rows.end && piece.right >= area.columns.first && piece.left < area.columns.end
    return shown ? [{ merge, piece }] : []
  })

const overflowEnd = (layout: Layout, row: number, column: number, cell: Cell, bounds: Range, covered: (row: number, column: number) => boolean) => {
  if (cell.wrap || cell.align !== 'left') return column
  const cells = layout.sheet.cells.get(row)
  let end = column
  while (end < Math.min(bounds.right, column + OVERFLOW_COLUMNS) && !cells?.has(end + 1) && !covered(row, end + 1)) end += 1
  return end
}

const cellBoxes = (layout: Layout, area: Area, bounds: Range) => {
  const pieces = piecesIn(layout, area, bounds)
  const covered = (row: number, column: number) => pieces.some(({ piece }) => within(piece, row, column))
  const lowest = Math.max(bounds.left, area.columns.first - OVERFLOW_COLUMNS)
  const plain = counted(area.rows).flatMap(row =>
    [...(layout.sheet.cells.get(row) ?? [])].flatMap(([column, cell]) => {
      if (column < lowest || column >= area.columns.end || column > bounds.right || covered(row, column)) return []
      const right = overflowEnd(layout, row, column, cell, bounds, covered)
      if (right < area.columns.first) return []
      return [cellBox(layout, area, { top: row, left: column, bottom: row, right }, cell)]
    }),
  )
  const merged = pieces.map(({ merge, piece }) => {
    const anchored = piece.top === merge.top && piece.left === merge.left
    return cellBox(layout, area, piece, anchored ? layout.sheet.cells.get(merge.top)?.get(merge.left) : undefined)
  })
  return [...plain, ...merged]
}

const gridLines = (layout: Layout, area: Area) => {
  const left = layout.columns.start(area.columns.first) - area.x
  const top = layout.rows.start(area.rows.first) - area.y
  const width = layout.columns.start(area.columns.end) - layout.columns.start(area.columns.first)
  const height = layout.rows.start(area.rows.end) - layout.rows.start(area.rows.first)
  const rowLines = counted(area.rows)
    .filter(row => layout.sheet.rows[row]! > 0)
    .map(row => div({ class: 'absolute border-b border-neutral-700', style: box({ x: left, y: layout.rows.start(row) - area.y, width, height: layout.sheet.rows[row]! }) }))
  const columnLines = counted(area.columns)
    .filter(column => layout.sheet.columns[column]! > 0)
    .map(column => div({ class: 'absolute border-r border-neutral-700', style: box({ x: layout.columns.start(column) - area.x, y: top, width: layout.sheet.columns[column]!, height }) }))
  return [...rowLines, ...columnLines]
}

const headerLook = 'absolute overflow-hidden border border-neutral-700 bg-neutral-900 pt-px text-xs leading-4 text-neutral-500'

const columnHeads = (layout: Layout, area: Area) =>
  counted(area.columns)
    .filter(column => layout.sheet.columns[column]! > 0)
    .map(column =>
      div({ class: [headerLook, 'text-center'], style: framed({ x: layout.columns.start(column) - area.x, y: 0, width: layout.sheet.columns[column]!, height: HEADER_PX }) }, letters(column)),
    )

const rowHeads = (layout: Layout, area: Area) =>
  counted(area.rows)
    .filter(row => layout.sheet.rows[row]! > 0)
    .map(row =>
      div({ class: [headerLook, 'pr-1.5 text-right'], style: framed({ x: 0, y: layout.rows.start(row) - area.y, width: layout.numberWidth, height: layout.sheet.rows[row]! }) }, String(row + 1)),
    )

const cornerHead = (layout: Layout) => div({ class: headerLook, style: framed({ x: 0, y: 0, width: layout.numberWidth, height: HEADER_PX }) })

const frozenTrack = (count: number, origin: number): Track => ({ shown: { first: 0, end: count }, whole: { first: 0, end: count }, origin, frozen: true })

const movingTrack = (axis: Axis, frozen: number, shown: Span): Track => ({ shown, whole: { first: frozen, end: axis.count }, origin: axis.start(frozen), frozen: false })

const pane = (layout: Layout, rows: Track, columns: Track) => {
  const area = { rows: rows.shown, columns: columns.shown, x: columns.origin, y: rows.origin }
  const bounds = { top: rows.whole.first, left: columns.whole.first, bottom: rows.whole.end - 1, right: columns.whole.end - 1 }
  return [
    ...gridLines(layout, area),
    ...cellBoxes(layout, area, bounds),
    ...(rows.frozen ? columnHeads(layout, area) : []),
    ...(columns.frozen ? rowHeads(layout, area) : []),
    ...(rows.frozen && columns.frozen ? [cornerHead(layout)] : []),
  ]
}

const pinnedLeft = (layout: Layout, height: number, content: Node | Node[]) =>
  div({ class: 'sticky left-0 z-10 shrink-0 border-r border-neutral-700 bg-neutral-950', style: { width: px(layout.left), height: px(height) } }, content)

const sheetGrid = (sheet: Sheet, name: string) => {
  const layout = layoutOf(sheet)
  const shown = sig({ rows: { first: 0, end: 0 }, columns: { first: 0, end: 0 } })
  const key = derive(() => JSON.stringify(shown.get()))
  const frozenRows = frozenTrack(layout.frozenRows, -HEADER_PX)
  const frozenColumns = frozenTrack(layout.frozenColumns, -layout.numberWidth)
  const movingRows = () => movingTrack(layout.rows, layout.frozenRows, shown.get().rows)
  const movingColumns = () => movingTrack(layout.columns, layout.frozenColumns, shown.get().columns)

  const follow = (scroller: Element) => {
    const next = {
      rows: spanAt(layout.rows, layout.frozenRows, scroller.scrollTop, scroller.clientHeight, ROW_CHUNK),
      columns: spanAt(layout.columns, layout.frozenColumns, scroller.scrollLeft, scroller.clientWidth, COLUMN_CHUNK),
    }
    if (JSON.stringify(next) !== key.get()) shown.set(next)
  }

  const scrolling = (build: () => Node[]) => dynamicChild(key, () => div(build()))
  const movingWidth = layout.columns.total - layout.columns.start(layout.frozenColumns)
  const movingHeight = layout.rows.total - layout.rows.start(layout.frozenRows)
  return div(
    {
      role: 'region',
      'aria-label': `Sheet ${name}`,
      class: 'scrollbars-thin min-h-0 flex-1 overflow-auto overscroll-contain',
      style: { flexBasis: '0px' },
      onScroll: (event: Event) => event.currentTarget instanceof Element && follow(event.currentTarget),
      onMount: (scroller: HTMLElement) => {
        follow(scroller)
        resizeObserver(scroller, () => follow(scroller))
      },
    },
    div(
      { class: 'relative', style: { width: px(layout.left + movingWidth), height: px(layout.top + movingHeight) } },
      div(
        { class: 'sticky top-0 z-20 flex border-b border-neutral-700', style: { height: px(layout.top) } },
        pinnedLeft(layout, layout.top, pane(layout, frozenRows, frozenColumns)),
        div({ class: 'relative shrink-0 bg-neutral-950', style: { width: px(movingWidth), height: px(layout.top) } }, scrolling(() => pane(layout, frozenRows, movingColumns()))),
      ),
      div(
        { class: 'flex' },
        pinnedLeft(layout, movingHeight, scrolling(() => pane(layout, movingRows(), frozenColumns))),
        div({ class: 'relative shrink-0', style: { width: px(movingWidth), height: px(movingHeight) } }, scrolling(() => pane(layout, movingRows(), movingColumns()))),
      ),
    ),
  )
}

export { sheetGrid }
