import type { OpenFile } from '@sand/file-viewer/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, sig } from '@vaakx-dev/vrui'
import { openArchive } from '../archive'
import { awaited } from '../awaited'
import { note } from '../note'
import { sheetGrid } from './grid'
import { type Sheet, type SheetEntry, type Workbook, workbookOf } from './workbook'

const sheetView = (kit: Kit, sheet: Sheet, name: string) => {
  if (sheet.rows.length === 0) return note(kit, 'This sheet is empty.')
  return div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    sheet.clipped ? div({ class: 'shrink-0 px-3 py-1.5' }, kit.metaLine('This sheet is too large to show whole. Showing its first part.')) : null,
    sheetGrid(sheet, name),
  )
}

const sheetPane = (kit: Kit, book: Workbook, entry: SheetEntry) =>
  awaited({ kit, pending: book.sheet(entry), failure: `Couldn't read the sheet ${entry.name}`, shown: sheet => sheetView(kit, sheet, entry.name) })

const workbookView = async (file: OpenFile, kit: Kit) => {
  const book = await workbookOf(await openArchive(file))
  if (book.sheets.length === 0) return note(kit, 'This workbook has no sheets to show.')
  const selected = sig(0)
  const tabs = book.sheets.map((entry, index) => kit.tab({ title: entry.name, selected: () => selected.get() === index, onSelect: () => selected.set(index) }))
  return div(
    { class: 'flex min-h-0 flex-1 flex-col', style: { flexBasis: '0px' } },
    div({ class: 'shrink-0 border-b border-neutral-800 px-2 py-1.5' }, kit.tabStrip('Sheets', ...tabs)),
    dynamicChild(selected, index => sheetPane(kit, book, book.sheets[index]!)),
  )
}

export { workbookView }
