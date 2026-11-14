import { forksOf } from './branches'
import type { EntryCache } from './cache'
import type { AppendMeta, Entry, Message, Session, SessionInfo } from './contract'
import type { Database } from 'bun:sqlite'
import type { Paging } from './paging'
import { entryColumns, parseRow, type Row } from './paging/rows'

export interface SessionHooks {
  entry(session: Session, entry: Entry): void
  update(session: Session): void
}

export const createSession = (db: Database, info: SessionInfo, hooks: SessionHooks, cache: EntryCache, paging: Paging): Session => {
  const insert = db.query(
    'insert into entries (id, session, parent, at, type, data, size, seq, turn) values ($id, $session, $parent, $at, $type, $data, $size, $seq, $turn)',
  )
  const nextSeq = db.query<{ seq: number }, { session: string }>('insert or replace into changes (session) values ($session) returning seq')
  const headOf = db.query<{ head: string | null }, { id: string }>('select head from chats where id = $id')
  const setHead = db.query('update chats set head = $head where id = $id')
  const load = db.query<Row, { session: string }>(`select ${entryColumns} from entries e where e.session = $session`)
  let entries: Map<string, Entry> | undefined
  let known = info.head
  const unload = () => {
    entries = undefined
  }
  const current = () => {
    const head = headOf.get({ id: info.id })?.head ?? null
    if (head !== known) {
      unload()
      known = head
    }
    return head
  }
  const all = () => {
    current()
    const map = (entries ??= new Map(load.all({ session: info.id }).map(row => [row.id, parseRow(row)])))
    cache.touch(info.id, unload)
    return map
  }

  const write = db
    .transaction((type: string, data: unknown, { id = Bun.randomUUIDv7(), at = Date.now(), turn }: AppendMeta): Entry => {
      const parent = current()
      const { seq } = nextSeq.get({ session: info.id })!
      const json = JSON.stringify(data)
      insert.run({ id, session: info.id, parent, at, type, data: json, size: json.length, seq, turn: turn ?? null })
      setHead.run({ head: id, id: info.id })
      known = id
      return { id, session: info.id, parent, at, type, data, seq, ...(turn && { turn }) }
    })
    .immediate

  const session: Session = {
    ...info,
    owner: 'thread',
    get head() {
      return current()
    },
    append(type, data, meta = {}) {
      const entry = write(type, data, meta)
      all().set(entry.id, entry)
      hooks.entry(session, entry)
      return entry
    },
    path() {
      const path: Entry[] = []
      const map = all()
      for (let entry = known ? map.get(known) : undefined; entry; entry = map.get(entry.parent ?? '')) {
        path.push(entry)
      }
      return path.reverse()
    },
    page(before, size) {
      return paging.page(info.id, before ? paging.parent(info.id, before) : session.head, size)
    },
    since: after => paging.since(info.id, session.head, after),
    carried: (before, types) => paging.carried(info.id, before, types),
    latest(type) {
      const head = current()
      return head ? paging.latest(info.id, head, type) : undefined
    },
    forks: () => forksOf(session.entries()),
    entries: () => [...all().values()].sort((a, b) => a.seq - b.seq),
    messages: () => session.path().flatMap(entry => (entry.type === 'message' ? [entry.data as Message] : [])),
    checkout(entry) {
      setHead.run({ head: entry, id: info.id })
      known = entry
      hooks.update(session)
    },
  }
  return session
}
