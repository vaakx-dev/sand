import { extensionOf, type OpenFile } from '@sand/file-viewer/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { div, dynamicChild, section, sig, table, tbody, td, th, thead, tr } from '@vaakx-dev/vrui'
import { Pictures } from '../pictures'
import { opened } from '../source'
import { descendants, parseXml } from '../xml'
import { MAX_COLUMNS, MAX_ROWS, type Sheet, sheetsOf } from './sheet'
import { styleLooks } from './styles'
import { imagePaths, odfBody, type Scope } from './text'

const MAX_SLIDES = 1_000

const columnName = (index: number): string => (index < 26 ? String.fromCharCode(65 + index) : `${columnName(Math.floor(index / 26) - 1)}${columnName(index % 26)}`)

const headCell = (text: string) => th({ class: 'border border-neutral-800 bg-neutral-900 px-2 py-1 font-normal text-neutral-500' }, text)

const sheetTable = (sheet: Sheet) => {
  const columns = Array.from({ length: sheet.columns }, (_, index) => index)
  const header = tr(headCell(''), ...columns.map(index => headCell(columnName(index))))
  const rows = sheet.rows.map((cells, row) =>
    tr(
      headCell(String(row + 1)),
      ...columns.map(index => {
        const cell = cells[index]
        return td({ class: ['border border-neutral-800 px-2 py-1 align-top whitespace-pre-wrap', cell?.number ? 'text-right tabular-nums' : 'text-left'] }, cell?.text ?? '')
      }),
    ),
  )
  return div({ class: 'min-w-0 overflow-x-auto' }, table({ class: 'border-collapse text-xs text-neutral-100' }, thead(header), tbody(...rows)))
}

const sheetNote = (kit: Kit, sheet: Sheet) => {
  const size = `${plural(sheet.rows.length, 'row')}, ${plural(sheet.columns, 'column')}`
  return kit.metaLine(sheet.truncated ? `${size} shown; only the first ${MAX_ROWS} rows and ${MAX_COLUMNS} columns are shown` : size)
}

const workbook = (kit: Kit, sheets: Sheet[]) => {
  const chosen = sig(0)
  const tabs = kit.tabStrip('Sheets', ...sheets.map((sheet, index) => kit.tab({ title: sheet.name, selected: () => chosen.get() === index, onSelect: () => chosen.set(index) })))
  return div(
    { class: 'flex min-w-0 flex-col gap-3 p-4' },
    sheets.length > 1 ? tabs : null,
    dynamicChild(chosen, index => {
      const sheet = sheets[index]
      return sheet ? div({ class: 'flex min-w-0 flex-col gap-2' }, sheetNote(kit, sheet), sheetTable(sheet)) : null
    }),
  )
}

const slide = (kit: Kit, scope: Scope, page: Element, index: number) =>
  section(
    { class: 'flex min-w-0 flex-col gap-2 rounded-lg border border-neutral-800 p-4' },
    kit.metaLine(`Slide ${index + 1}`),
    kit.prose(...odfBody(scope, page)),
  )

const slides = (kit: Kit, scope: Scope, content: Document) => {
  const pages = descendants(content, 'draw', 'page').slice(0, MAX_SLIDES)
  if (!pages.length) throw new Error('it has no slides')
  return div({ class: 'flex min-w-0 flex-col gap-4 p-4' }, kit.metaLine(plural(pages.length, 'slide')), ...pages.map((page, index) => slide(kit, scope, page, index)))
}

const textDocument = (kit: Kit, scope: Scope, content: Document) => {
  const body = descendants(content, 'office', 'text')[0]
  if (!body) throw new Error('it has no text')
  return div({ class: 'p-4' }, kit.prose(...odfBody(scope, body)))
}

const withPictures = (node: HTMLElement, pictures: Pictures) => div({ class: 'min-w-0', onMount: () => () => pictures.revoke() }, node)

const odfView = async (kit: Kit, file: OpenFile) => {
  const zip = await opened(file)
  const content = parseXml(await zip.text('content.xml'))
  if (extensionOf(file.name) === 'ods') return workbook(kit, sheetsOf(content))
  const pictures = new Pictures(zip)
  const scope = { looks: styleLooks(content), pictures: await pictures.load(imagePaths(content)) }
  const view = extensionOf(file.name) === 'odp' ? slides(kit, scope, content) : textDocument(kit, scope, content)
  return withPictures(view, pictures)
}

export { odfView }
