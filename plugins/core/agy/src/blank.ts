import { Database } from 'bun:sqlite'

interface Needle {
  bytes: Buffer
  mask: Buffer
}

interface Row {
  key: number
  value: unknown
}

interface Column {
  table: string
  name: string
}

const MASK = '*'

const quoted = (name: string) => `"${name.replaceAll('"', '""')}"`

const escaped = (text: string) => JSON.stringify(text).slice(1, -1)

function needle(text: string): Needle {
  const bytes = Buffer.from(text)
  return { bytes, mask: Buffer.alloc(bytes.length, MASK) }
}

function needlesOf(values: string[]): Needle[] {
  const forms = values.flatMap(value => [value, escaped(value), escaped(escaped(value))])
  return [...new Set(forms)].map(needle)
}

function masked(blob: Uint8Array, needles: Needle[]): Buffer | undefined {
  const out = Buffer.from(blob)
  const found = needles.filter(({ bytes }) => out.includes(bytes))
  if (!found.length) return undefined
  for (const { bytes, mask } of found) for (let at = out.indexOf(bytes); at >= 0; at = out.indexOf(bytes, at + bytes.length)) mask.copy(out, at)
  return out
}

function blobColumns(database: Database): Column[] {
  const tables = database.query<{ name: string }, []>("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'").all()
  return tables.flatMap(({ name: table }) =>
    database
      .query<{ name: string; type: string }, []>(`pragma table_info(${quoted(table)})`)
      .all()
      .filter(({ type }) => type.toLowerCase() === 'blob')
      .map(({ name }) => ({ table, name })),
  )
}

function blankColumn(database: Database, { table, name }: Column, needles: Needle[]) {
  const rows = database.query<Row, []>(`select rowid as key, ${quoted(name)} as value from ${quoted(table)}`).all()
  const update = database.query(`update ${quoted(table)} set ${quoted(name)} = ? where rowid = ?`)
  const changed = rows.flatMap(({ key, value }) => {
    const out = value instanceof Uint8Array ? masked(value, needles) : undefined
    return out ? [{ key, out }] : []
  })
  changed.forEach(({ key, out }) => update.run(out, key))
  return changed.length
}

function blankDatabase(database: Database, needles: Needle[]) {
  return blobColumns(database).reduce((changed, column) => changed + blankColumn(database, column, needles), 0)
}

function compact(database: Database) {
  database.run('vacuum')
  database.run('pragma wal_checkpoint(truncate)')
}

async function blankConversation(path: string, values: string[]) {
  if (!(await Bun.file(path).exists())) return
  const database = new Database(path)
  try {
    const changed = database.transaction(() => blankDatabase(database, needlesOf(values)))()
    if (changed) compact(database)
  } finally {
    database.close()
  }
}

export { blankConversation }
