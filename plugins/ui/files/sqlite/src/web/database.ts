import type { BindParams, SqlValue } from 'sql.js'
import { type Engine, workerEngine } from './engine'

interface Table {
  name: string
  kind: 'table' | 'view'
  rows?: number
}

interface Column {
  name: string
  type: string
}

interface Page {
  columns: Column[]
  hiddenColumns: number
  rows: SqlValue[][]
  more: boolean
}

const HEADER = 'SQLite format 3\0'
const PAGE_ROWS = 50
const MAX_COLUMNS = 100

const TABLES = `SELECT name, type FROM sqlite_schema
  WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' AND coalesce(sql, '') NOT LIKE 'CREATE VIRTUAL TABLE%'
  ORDER BY type, name COLLATE NOCASE`

const COLUMNS = 'SELECT name, type FROM pragma_table_xinfo(?) WHERE hidden != 1'

const quoted = (name: string) => `"${name.replaceAll('"', '""')}"`

const isSqlite = (data: Uint8Array) => new TextDecoder().decode(data.subarray(0, HEADER.length)) === HEADER

class Database {
  readonly #engine: Engine

  constructor(engine: Engine) {
    this.#engine = engine
  }

  async #values(sql: string, params?: BindParams) {
    return (await this.#engine.exec(sql, params))[0]?.values ?? []
  }

  async #count(name: string) {
    return Number((await this.#values(`SELECT count(*) FROM ${quoted(name)}`))[0]?.[0] ?? 0)
  }

  async tables() {
    const found = await this.#values(TABLES)
    return Promise.all(
      found.map(async ([name, type]): Promise<Table> => {
        const table = String(name)
        return type === 'view' ? { name: table, kind: 'view' } : { name: table, kind: 'table', rows: await this.#count(table) }
      }),
    )
  }

  async page(table: Table, offset: number): Promise<Page> {
    const all = (await this.#values(COLUMNS, [table.name])).map(([name, type]) => ({ name: String(name), type: String(type ?? '') }))
    const columns = all.slice(0, MAX_COLUMNS)
    const select = columns.map(column => quoted(column.name)).join(', ')
    const rows = await this.#values(`SELECT ${select} FROM ${quoted(table.name)} LIMIT ? OFFSET ?`, [PAGE_ROWS + 1, offset])
    return { columns, hiddenColumns: all.length - columns.length, rows: rows.slice(0, PAGE_ROWS), more: rows.length > PAGE_ROWS }
  }

  close() {
    this.#engine.close()
  }
}

const openDatabase = async (data: Uint8Array<ArrayBuffer>) => {
  if (!isSqlite(data)) throw new Error("This isn't a SQLite database")
  return new Database(await workerEngine(data))
}

export { Database, PAGE_ROWS, openDatabase, type Column, type Page, type Table }
