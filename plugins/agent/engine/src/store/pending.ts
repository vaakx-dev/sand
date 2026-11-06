import type { Database } from 'bun:sqlite'
import type { ConversationRef, Owner, PendingItem, PendingKind, TurnOrigin } from '../contract'
import { keyOf } from './key'

interface Row {
  id: string
  kind: PendingKind
  prompt: string
  label: string
  origin: TurnOrigin
  held: number
  at: number
}

export type NewPending = Pick<PendingItem, 'kind' | 'prompt' | 'label' | 'origin'>

export type Holding = 'all' | 'user' | 'none'

type Key = ReturnType<typeof keyOf>

const itemOf = (row: Row): PendingItem => ({
  id: row.id,
  kind: row.kind,
  label: row.label,
  prompt: JSON.parse(row.prompt),
  origin: row.origin,
  held: row.held === 1,
  at: row.at,
})

const settleSql = `update pending set kind = 'queue',
  held = case $holding when 'all' then 1 when 'user' then origin = 'user' else 0 end
  where owner = $owner and conversation = $conversation and kind = 'steer'`

const scoped = 'owner = $owner and conversation = $conversation'

export const createPendingStore = (db: Database) => {
  const inserted = db.query<Row, Record<string, string | number>>(
    `insert into pending (id, owner, conversation, kind, prompt, label, origin, at)
      values ($id, $owner, $conversation, $kind, $prompt, $label, $origin, $at) returning *`,
  )
  const listed = db.query<Row, Key>(`select * from pending where ${scoped} order by at, id`)
  const steers = db.query<Row, Key>(`select * from pending where ${scoped} and kind = 'steer' order by at, id`)
  const next = db.query<Row, Key>(`select * from pending where ${scoped} and kind = 'queue' and held = 0 order by at, id limit 1`)
  const found = db.query(`select 1 from pending where ${scoped} and id = $id`)
  const removed = db.query(`delete from pending where ${scoped} and id = $id`)
  const held = db.query(`update pending set held = $held where ${scoped} and id = $id and kind = 'queue'`)
  const settled = db.query(settleSql)
  const waiting = db.query<{ conversation: string }, { owner: Owner }>(
    "select distinct conversation from pending where owner = $owner and kind = 'queue' and held = 0",
  )
  const cleared = db.query(`delete from pending where ${scoped}`)

  return {
    add: (conversation: ConversationRef, { prompt, ...item }: NewPending) =>
      itemOf(inserted.get({ ...item, ...keyOf(conversation), id: Bun.randomUUIDv7(), prompt: JSON.stringify(prompt), at: Date.now() })!),
    list: (conversation: ConversationRef) => listed.all(keyOf(conversation)).map(itemOf),
    steers: (conversation: ConversationRef) => steers.all(keyOf(conversation)).map(itemOf),
    next(conversation: ConversationRef) {
      const row = next.get(keyOf(conversation))
      return row ? itemOf(row) : undefined
    },
    has: (conversation: ConversationRef, id: string) => found.get({ ...keyOf(conversation), id }) !== null,
    remove: (conversation: ConversationRef, id: string) => removed.run({ ...keyOf(conversation), id }).changes > 0,
    hold: (conversation: ConversationRef, id: string, hold: boolean) => held.run({ ...keyOf(conversation), id, held: Number(hold) }).changes > 0,
    settle: (conversation: ConversationRef, holding: Holding) => settled.run({ ...keyOf(conversation), holding }).changes > 0,
    waiting: (owner: Owner) => waiting.all({ owner }).map(row => row.conversation),
    clear: (conversation: ConversationRef) => void cleared.run(keyOf(conversation)),
  }
}

export type PendingStore = ReturnType<typeof createPendingStore>
