import type { Entry } from '../contract'
import type { Database } from 'bun:sqlite'
import { defaultPage } from './page'
import { entryColumns, parseRow, type Row } from './rows'
import { pathWalker } from './walk'

interface Cursor {
  id: string
  seq: number
}

type Params = { session: string; seq: number }

const newer = 'e.session = $session and (e.seq > $seq or (e.seq is null and e.rowid > $seq))'

export const sinceReader = (db: Database) => {
  const walk = pathWalker(db)
  const byId = db.query<Cursor, { session: string; id: string }>(
    'select id, coalesce(seq, rowid) as seq from entries where session = $session and id = $id',
  )
  const bySeq = db.query<Cursor, Params>(
    'select id, coalesce(seq, rowid) as seq from entries where session = $session and (seq = $seq or (seq is null and rowid = $seq))',
  )
  const counted = db.query<{ count: number; bytes: number }, Params>(
    `select count(*) as count, coalesce(sum(coalesce(e.size, length(e.data))), 0) as bytes from entries e where ${newer}`,
  )
  const after = db.query<Row, Params>(`select ${entryColumns} from entries e where ${newer} order by coalesce(e.seq, e.rowid)`)

  return (session: string, head: string | null, from: number | string): Entry[] | undefined => {
    const cursor = typeof from === 'string' ? byId.get({ session, id: from }) : bySeq.get({ session, seq: from })
    if (!cursor || !head) return undefined
    const { count, bytes } = counted.get({ session, seq: cursor.seq })!
    if (bytes > 2 * defaultPage.bytes) return undefined
    if (!walk(session, head, count + 1).some(step => step.id === cursor.id)) return undefined
    return count ? after.all({ session, seq: cursor.seq }).map(parseRow) : []
  }
}
