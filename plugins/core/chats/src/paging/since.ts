import type { Entry } from '../contract'
import type { Database } from 'bun:sqlite'
import { defaultPage } from './page'
import { parseRow, type Row } from './rows'
import { sizeFiller, type Unsized } from './size'
import { pathWalker } from './walk'

type Params = { session: string; id: string }

export const sinceReader = (db: Database) => {
  const walk = pathWalker(db)
  const rowOf = db.query<{ row: number }, Params>('select rowid as row from entries where id = $id and session = $session')
  const unsized = db.query<Unsized, { session: string; row: number }>(
    'select id, data from entries where session = $session and rowid > $row and size is null',
  )
  const fill = sizeFiller(db)
  const counted = db.query<{ count: number; bytes: number }, { session: string; row: number }>(
    'select count(*) as count, coalesce(sum(size), 0) as bytes from entries where session = $session and rowid > $row',
  )
  const after = db.query<Row, { session: string; row: number }>('select * from entries where session = $session and rowid > $row order by rowid')

  return (session: string, head: string | null, id: string): Entry[] | undefined => {
    const known = rowOf.get({ session, id })
    if (!known || !head) return undefined
    fill(unsized.all({ session, row: known.row }))
    const { count, bytes } = counted.get({ session, row: known.row })!
    if (bytes > 2 * defaultPage.bytes) return undefined
    if (!walk(session, head, count + 1).some(step => step.id === id)) return undefined
    return count ? after.all({ session, row: known.row }).map(parseRow) : []
  }
}
