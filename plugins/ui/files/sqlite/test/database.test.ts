import { Database as Native } from 'bun:sqlite'
import { expect, test } from 'bun:test'
import initSqlJs from 'sql.js'
import { Database, openDatabase } from '../src/web/database'
import type { Engine } from '../src/web/engine'

const made = (setup: (native: Native) => void) => {
  const native = new Native(':memory:')
  setup(native)
  const data = native.serialize()
  native.close()
  return new Uint8Array(data)
}

const inPage = async (data: Uint8Array): Promise<Engine> => {
  const { Database: Opened } = await initSqlJs()
  const opened = new Opened(data)
  return { exec: async (sql, params) => opened.exec(sql, params), close: () => opened.close() }
}

const BAKERY = `
  CREATE TABLE "odd ""loaves""; list" (id INTEGER PRIMARY KEY, name TEXT, photo BLOB, price REAL, total REAL GENERATED ALWAYS AS (price * 2) VIRTUAL);
  CREATE TABLE ovens (heat INTEGER);
  CREATE VIEW warm AS SELECT heat FROM ovens WHERE heat > 180;
  CREATE VIEW broken AS SELECT * FROM ovens;
`

const bakery = (native: Native) => {
  native.run(BAKERY)
  const insert = native.prepare('INSERT INTO "odd ""loaves""; list" (name, photo, price) VALUES (?, ?, ?)')
  for (let at = 1; at <= 60; at++) insert.run(`loaf ${at}`, at === 1 ? new Uint8Array([1, 2, 3]) : null, at)
  native.run('INSERT INTO ovens VALUES (150), (200), (220)')
  native.run('DROP TABLE ovens; CREATE TABLE ovens (temperature INTEGER)')
}

test('a database lists its tables with row counts and views, and pages through rows', async () => {
  const database = new Database(await inPage(made(bakery)))
  const tables = await database.tables()
  expect(tables).toEqual([
    { name: 'odd "loaves"; list', kind: 'table', rows: 60 },
    { name: 'ovens', kind: 'table', rows: 0 },
    { name: 'broken', kind: 'view' },
    { name: 'warm', kind: 'view' },
  ])
  const first = await database.page(tables[0]!, 0)
  expect(first.columns.map(column => `${column.name} ${column.type}`)).toEqual(['id INTEGER', 'name TEXT', 'photo BLOB', 'price REAL', 'total REAL'])
  expect(first.rows).toHaveLength(50)
  expect(first.more).toBe(true)
  expect(first.rows[0]).toEqual([1, 'loaf 1', new Uint8Array([1, 2, 3]), 1, 2])
  const second = await database.page(tables[0]!, 50)
  expect(second.rows.map(row => row[0])).toEqual([51, 52, 53, 54, 55, 56, 57, 58, 59, 60])
  expect(second.more).toBe(false)
  await expect(database.page(tables[3]!, 0)).rejects.toThrow('no such column: heat')
  database.close()
})

test('a file that is not SQLite is refused before the engine loads', async () => {
  await expect(openDatabase(new TextEncoder().encode('name,price\nrye,4\n'))).rejects.toThrow("This isn't a SQLite database")
})
