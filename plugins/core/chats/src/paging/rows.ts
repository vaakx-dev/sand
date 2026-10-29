import type { Entry } from '../contract'
import type { Database } from 'bun:sqlite'

export type Row = Omit<Entry, 'data'> & { data: string }

export const parseRow = ({ id, session, parent, at, type, data }: Row): Entry => ({ id, session, parent, at, type, data: JSON.parse(data) })

export const rowsById = (db: Database) => {
  const query = db.query<Row, { ids: string }>('select * from entries where id in (select value from json_each($ids))')
  return (ids: string[]) => {
    const found = new Map(query.all({ ids: JSON.stringify(ids) }).map(row => [row.id, parseRow(row)]))
    return ids.flatMap(id => found.get(id) ?? [])
  }
}
