import type { Entry } from '@sand/messages'
import type { SessionInfo } from '../contract'
import type { Database } from 'bun:sqlite'
import { current, upgradeAll } from './upgrade'

type Row = Omit<Entry, 'data'> & { data: string }

export const rewriter = (db: Database) => {
  const load = db.query<Row, { session: string }>('select * from entries where session = $session')
  const clear = db.query('delete from entries where session = $session')
  const insert = db.query('insert into entries (id, session, parent, at, type, data) values ($id, $session, $parent, $at, $type, $data)')
  const finish = db.query('update sessions set head = $head, format = $format where id = $id')
  return db.transaction((info: SessionInfo): SessionInfo => {
    const entries = load.all({ session: info.id }).map(row => ({ ...row, data: JSON.parse(row.data) }))
    const upgraded = upgradeAll(entries, info.format ?? 1)
    clear.run({ session: info.id })
    for (const entry of upgraded.entries) insert.run({ ...entry, data: JSON.stringify(entry.data) })
    const head = upgraded.resolve(info.head)
    finish.run({ head, format: current, id: info.id })
    return { ...info, head, format: current }
  })
}
