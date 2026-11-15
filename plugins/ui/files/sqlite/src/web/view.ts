import type { OpenFile } from '@sand/file-viewer/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { bytes, errorMessage, plural } from '@sand/util'
import { type Child, div, dynamicChild, type Sig, sig } from '@vaakx-dev/vrui'
import { type Database, openDatabase, PAGE_ROWS, type Page, type Table } from './database'
import { grid } from './grid'

interface Parts {
  kit: Kit
  file: OpenFile
}

interface Browser {
  database: Database
  tables: Table[]
  open: Sig<Table | undefined>
}

type Read = { kind: 'loading' } | { kind: 'ready'; page: Page; offset: number } | { kind: 'failed'; error: string }

const MAX_DATABASE_BYTES = 100 * 1024 * 1024

const count = (value: number) => value.toLocaleString()

const rowsLabel = (rows: number) => `${count(rows)} ${rows === 1 ? 'row' : 'rows'}`

const bar = ({ kit }: Parts, { back, title, meta, actions = [] }: { back(): void; title: string; meta: () => string; actions?: Child[] }) =>
  div(
    { class: 'flex min-h-12 shrink-0 items-center gap-1 border-b border-neutral-800 pr-2 pl-2' },
    kit.backButton({ title: 'Back to tables', onClick: back }),
    div({ class: 'flex min-w-0 flex-1 flex-col' }, kit.rowName(title), kit.metaLine(meta)),
    ...actions,
  )

const readPage = async (database: Database, table: Table, offset: number): Promise<Read> => {
  try {
    return { kind: 'ready', page: await database.page(table, offset), offset }
  } catch (error) {
    return { kind: 'failed', error: `Couldn't read ${table.name}: ${errorMessage(error)}` }
  }
}

const rangeOf = (table: Table, read: Read) => {
  if (read.kind !== 'ready') return table.kind === 'view' ? 'View' : rowsLabel(table.rows ?? 0)
  const { page, offset } = read
  const columns = plural(page.columns.length + page.hiddenColumns, 'column')
  if (page.rows.length === 0) return `No rows · ${columns}`
  const range = `Rows ${count(offset + 1)}–${count(offset + page.rows.length)}`
  return table.rows === undefined ? `${range} · ${columns}` : `${range} of ${count(table.rows)} · ${columns}`
}

const pageBody = ({ kit }: Parts, table: Table, read: Read) => {
  if (read.kind === 'loading') return kit.loadingState({})
  if (read.kind === 'failed') return div({ class: 'p-2' }, kit.errorState({ text: read.error }))
  if (read.page.rows.length > 0) return grid(kit, read.page)
  return div({ class: 'px-4 py-2' }, kit.emptyState({ text: `This ${table.kind} has no rows.` }))
}

const tablePane = (parts: Parts, browser: Browser, table: Table) => {
  const { kit } = parts
  const offset = sig(0)
  const read = sig<Read>({ kind: 'loading' })
  const show = (at: number) => {
    offset.set(at)
    void readPage(browser.database, table, at).then(found => {
      if (offset.get() === at) read.set(found)
    })
  }
  const more = () => {
    const value = read.get()
    return value.kind === 'ready' && value.page.more
  }
  const step = (by: number) => show(Math.max(0, offset.get() + by))
  show(0)
  return div(
    { class: 'flex flex-1 flex-col' },
    bar(parts, {
      back: () => browser.open.set(undefined),
      title: table.name,
      meta: () => rangeOf(table, read.get()),
      actions: [
        kit.iconButton({ title: 'Previous rows', 'aria-label': 'Previous rows', disabled: () => offset.get() === 0, onClick: () => step(-PAGE_ROWS) }, kit.icon('left')),
        kit.iconButton({ title: 'Next rows', 'aria-label': 'Next rows', disabled: () => !more(), onClick: () => step(PAGE_ROWS) }, kit.icon('right')),
      ],
    }),
    dynamicChild(read, value => pageBody(parts, table, value)),
  )
}

const summary = (tables: Table[]) => {
  const views = tables.filter(table => table.kind === 'view').length
  const counts = [plural(tables.length - views, 'table'), views > 0 ? plural(views, 'view') : '']
  return counts.filter(Boolean).join(' · ')
}

const tableRow = ({ kit }: Parts, browser: Browser, table: Table) =>
  kit.listRow({ title: table.name, trail: table.kind === 'view' ? 'View' : rowsLabel(table.rows ?? 0), opens: true, touch: true, onClick: () => browser.open.set(table) })

const listPane = (parts: Parts, browser: Browser) => {
  const { kit } = parts
  if (browser.tables.length === 0) return div({ class: 'px-4 py-3' }, kit.emptyState({ text: 'This database has no tables.' }))
  return div(
    { class: 'flex flex-col' },
    div({ class: 'px-4 pt-3' }, kit.metaLine(summary(browser.tables))),
    div({ class: 'flex flex-col p-2' }, ...browser.tables.map(table => tableRow(parts, browser, table))),
  )
}

const tablesOf = async (database: Database) => {
  try {
    return await database.tables()
  } catch (error) {
    database.close()
    throw error
  }
}

const databaseView = async (parts: Parts) => {
  const { file } = parts
  if (file.size > MAX_DATABASE_BYTES) throw new Error(`It's ${bytes(file.size)}; the viewer opens databases up to ${bytes(MAX_DATABASE_BYTES)}`)
  const database = await openDatabase(await file.bytes())
  const browser: Browser = { database, tables: await tablesOf(database), open: sig<Table | undefined>(undefined) }
  return div(
    { class: 'flex flex-1 flex-col', onMount: () => () => database.close() },
    dynamicChild(browser.open, table => (table ? tablePane(parts, browser, table) : listPane(parts, browser))),
  )
}

export { databaseView }
