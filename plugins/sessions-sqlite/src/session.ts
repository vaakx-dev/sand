import type { Entry, Message, Session, SessionInfo } from '@sand/protocol'
import type { Database } from 'bun:sqlite'

type Row = Omit<Entry, 'data'> & { data: string }

export interface SessionHooks {
  entry(session: Session, entry: Entry): void
  update(session: Session): void
}

export const createSession = (db: Database, info: SessionInfo, hooks: SessionHooks): Session => {
  const insert = db.query('insert into entries (id, session, parent, at, type, data) values ($id, $session, $parent, $at, $type, $data)')
  const setHead = db.query('update sessions set head = $head where id = $id')
  const setTitle = db.query('update sessions set title = $title, named = $named where id = $id')
  const load = db.query<Row, { session: string }>('select * from entries where session = $session')
  const append = db.transaction((entry: Entry) => {
    insert.run({ ...entry, data: JSON.stringify(entry.data) })
    setHead.run({ head: entry.id, id: entry.session })
  })
  let entries: Map<string, Entry> | undefined
  const all = () =>
    (entries ??= new Map(load.all({ session: info.id }).map(row => [row.id, { ...row, data: JSON.parse(row.data) }])))

  const session: Session = {
    ...info,
    append(type, data, id) {
      const entry = { id: id ?? Bun.randomUUIDv7(), session: info.id, parent: session.head, at: Date.now(), type, data }
      append(entry)
      all().set(entry.id, entry)
      session.head = entry.id
      hooks.entry(session, entry)
      return entry
    },
    path() {
      const path: Entry[] = []
      for (let entry = session.head ? all().get(session.head) : undefined; entry; entry = all().get(entry.parent ?? '')) {
        path.push(entry)
      }
      return path.reverse()
    },
    entries: () => [...all().values()].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)),
    messages: () => session.path().flatMap(entry => (entry.type === 'message' ? [entry.data as Message] : [])),
    checkout(entry) {
      setHead.run({ head: entry, id: info.id })
      session.head = entry
      hooks.update(session)
    },
    rename(title, named = true) {
      setTitle.run({ title, named: named ? 1 : 0, id: info.id })
      session.title = title
      hooks.update(session)
    },
  }
  return session
}
