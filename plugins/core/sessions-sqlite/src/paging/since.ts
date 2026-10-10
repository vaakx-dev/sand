import type { Entry } from '@sand/messages'
import type { Database } from 'bun:sqlite'
import { defaultPage } from './page'
import { parseRow, type Row } from './rows'
import { pathWalker } from './walk'

type Params = { session: string; id: string }

export const sinceReader = (db: Database) => {
  const walk = pathWalker(db)
  const rowOf = db.query<{ row: number }, Params>('select rowid as row from entries where id = $id and session = $session')
  const counted = db.query<{ count: number; bytes: number }, { session: string; row: number }>(
    'select count(*) as count, coalesce(sum(length(data)), 0) as bytes from entries where session = $session and rowid > $row',
  )
  const after = db.query<Row, { session: string; row: number }>('select * from entries where session = $session and rowid > $row order by rowid')

  return (session: string, head: string | null, id: string): Entry[] | undefined => {
    const known = rowOf.get({ session, id })
    if (!known || !head) return undefined
    const { count, bytes } = counted.get({ session, row: known.row })!
    if (bytes > 2 * defaultPage.bytes) return undefined
    if (!walk(session, head, count + 1).some(step => step.id === id)) return undefined
    return count ? after.all({ session, row: known.row }).map(parseRow) : []
  }
}
