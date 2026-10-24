import type { Database } from 'bun:sqlite'
import type { ChatPatch, SessionInfo } from './contract'
import { chatOf, chatRows, type ChatRow } from './rows'

const columnOf: Record<keyof ChatPatch, string> = {
  title: 'title',
  seen: 'seen',
  pinned: 'pinned',
  settled: 'settled',
  snoozed: 'snoozed',
  position: 'position',
}

const insertSql = `insert into chats (id, created, cwd, project, head, kind, parent, origin, title, seen, pinned, settled, snoozed, position)
  values ($id, $created, $cwd, $project, $head, $kind, $parent, $origin, $title, $seen, $pinned, $settled, $snoozed, $position)`

export const chatRecords = (db: Database) => {
  const insert = db.query(insertSql)
  const find = db.query<ChatRow, { id: string }>(`${chatRows} where c.id = $id`)
  const one = (row: ChatRow | null) => (row ? chatOf(row) : undefined)

  return {
    insert: (info: SessionInfo) => void insert.run({ ...info, seen: Number(info.seen), pinned: Number(info.pinned) }),
    find: (id: string) => one(find.get({ id })),
    patch(id: string, patch: ChatPatch) {
      const keys = Object.keys(patch) as (keyof ChatPatch)[]
      if (!keys.length) return
      const set = keys.map(key => `${columnOf[key]} = $${key}`).join(', ')
      const values = Object.fromEntries(keys.map(key => [key, typeof patch[key] === 'boolean' ? Number(patch[key]) : (patch[key] ?? null)]))
      db.query(`update chats set ${set} where id = $id`).run({ ...values, id })
    },
  }
}
