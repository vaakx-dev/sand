import type { Database } from 'bun:sqlite'
import { messageText } from './schema'

const batch = 2000

const fillSql = `insert into entries_text (rowid, text, session)
  select rowid, text, session from (
    select e.rowid as rowid, ${messageText('e')} as text, e.session as session from entries e
    where e.type = 'message' and e.rowid >= $from and e.rowid < $to and not exists (select 1 from entries_text t where t.rowid = e.rowid)
  ) where text is not null`

export const searchBackfill = (db: Database) => {
  const progress = db.query<{ next: number; last: number }, []>('select next, last from search_backfill')
  const fill = db.query<unknown, { from: number; to: number }>(fillSql)
  const advance = db.query<unknown, { next: number }>('update search_backfill set next = $next')
  const finish = db.query('delete from search_backfill')

  return db.transaction(() => {
    const row = progress.get()
    if (!row) return false
    const to = Math.min(row.next + batch, row.last + 1)
    fill.run({ from: row.next, to })
    if (to > row.last) finish.run()
    else advance.run({ next: to })
    return to <= row.last
  })
}
