import type { Entry, Message } from '@sand/messages'
import type { EntryCache } from './cache'
import type { Session, SessionInfo } from './contract'
import type { Database } from 'bun:sqlite'
import type { Paging } from './paging'

type Row = Omit<Entry, 'data'> & { data: string }

export interface SessionHooks {
  entry(session: Session, entry: Entry): void
  update(session: Session): void
}

export const createSession = (db: Database, info: SessionInfo, hooks: SessionHooks, cache: EntryCache, paging: Paging): Session => {
  const insert = db.query('insert into entries (id, session, parent, at, type, data) values ($id, $session, $parent, $at, $type, $data)')
  const setHead = db.query('update sessions set head = $head where id = $id')
  const setTitle = db.query('update sessions set title = $title, named = $named where id = $id')
  const load = db.query<Row, { session: string }>('select * from entries where session = $session')
  const append = db.transaction((...added: Entry[]) => {
    for (const entry of added) insert.run({ ...entry, data: JSON.stringify(entry.data) })
    setHead.run({ head: added.at(-1)!.id, id: info.id })
  })
  let entries: Map<string, Entry> | undefined
  const unload = () => {
    entries = undefined
  }
  const all = () => {
    const map = (entries ??= new Map(load.all({ session: info.id }).map(row => [row.id, { ...row, data: JSON.parse(row.data) }])))
    cache.touch(info.id, unload)
    return map
  }

  const session: Session = {
    ...info,
    append(type, data, id, at) {
      const entry = { id: id ?? Bun.randomUUIDv7(), session: info.id, parent: session.head, at: at ?? Date.now(), type, data }
      append(entry)
      all().set(entry.id, entry)
      session.head = entry.id
      hooks.entry(session, entry)
      return entry
    },
    appendMany(items) {
      if (!items.length) return
      const added = items.map((item, index) => ({ ...item, session: info.id, parent: index ? items[index - 1]!.id : session.head }))
      append(...added)
      const map = all()
      for (const entry of added) map.set(entry.id, entry)
      session.head = added.at(-1)!.id
      hooks.update(session)
    },
    path() {
      const path: Entry[] = []
      const map = all()
      for (let entry = session.head ? map.get(session.head) : undefined; entry; entry = map.get(entry.parent ?? '')) {
        path.push(entry)
      }
      return path.reverse()
    },
    page(before, size) {
      return paging.page(info.id, before ? paging.parent(info.id, before) : session.head, size)
    },
    since: after => paging.since(info.id, session.head, after),
    carried: (before, types) => paging.carried(info.id, before, types),
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
