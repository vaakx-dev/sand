import type { Entry } from '../contract'
import type { Database } from 'bun:sqlite'

export type Row = Omit<Entry, 'data' | 'turn'> & { data: string; turn: string | null }

export const entryColumns = 'e.id, e.session, e.parent, e.at, e.type, e.data, coalesce(e.seq, e.rowid) as seq, e.turn'

export const parseRow = ({ id, session, parent, at, type, data, seq, turn }: Row): Entry => ({
  id,
  session,
  parent,
  at,
  type,
  data: JSON.parse(data),
  seq,
  ...(turn && { turn }),
})

export const rowsById = (db: Database) => {
  const query = db.query<Row, { ids: string }>(`select ${entryColumns} from entries e where e.id in (select value from json_each($ids))`)
  return (ids: string[]) => {
    const found = new Map(query.all({ ids: JSON.stringify(ids) }).map(row => [row.id, parseRow(row)]))
    return ids.flatMap(id => found.get(id) ?? [])
  }
}
