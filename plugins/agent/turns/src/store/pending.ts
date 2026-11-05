import type { PendingItem, PendingKind, TurnOrigin } from '@sand/turns-contract/contract'
import type { Database } from 'bun:sqlite'

interface Row {
  id: string
  session: string
  kind: PendingKind
  prompt: string
  label: string
  origin: TurnOrigin
  held: number
  at: number
}

export type NewPending = Pick<PendingItem, 'kind' | 'prompt' | 'label' | 'origin'> & { session: string }

export type Holding = 'all' | 'user' | 'none'

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
  where session = $session and kind = 'steer'`

export const createPendingStore = (db: Database) => {
  const inserted = db.query<Row, Record<string, string | number>>(
    'insert into pending (id, session, kind, prompt, label, origin, at) values ($id, $session, $kind, $prompt, $label, $origin, $at) returning *',
  )
  const listed = db.query<Row, { session: string }>('select * from pending where session = $session order by at, id')
  const steers = db.query<Row, { session: string }>("select * from pending where session = $session and kind = 'steer' order by at, id")
  const next = db.query<Row, { session: string }>("select * from pending where session = $session and kind = 'queue' and held = 0 order by at, id limit 1")
  const removed = db.query('delete from pending where session = $session and id = $id')
  const held = db.query("update pending set held = $held where session = $session and id = $id and kind = 'queue'")
  const settled = db.query(settleSql)
  const waiting = db.query<{ session: string }, []>("select distinct session from pending where kind = 'queue' and held = 0")
  const cleared = db.query('delete from pending where session = $session')

  return {
    add: ({ prompt, ...item }: NewPending) => itemOf(inserted.get({ ...item, id: Bun.randomUUIDv7(), prompt: JSON.stringify(prompt), at: Date.now() })!),
    list: (session: string) => listed.all({ session }).map(itemOf),
    steers: (session: string) => steers.all({ session }).map(itemOf),
    next(session: string) {
      const row = next.get({ session })
      return row ? itemOf(row) : undefined
    },
    remove: (session: string, id: string) => removed.run({ session, id }).changes > 0,
    hold: (session: string, id: string, hold: boolean) => held.run({ session, id, held: Number(hold) }).changes > 0,
    settle: (session: string, holding: Holding) => settled.run({ session, holding }).changes > 0,
    waiting: () => waiting.all().map(row => row.session),
    clear: (session: string) => void cleared.run({ session }),
  }
}

export type PendingStore = ReturnType<typeof createPendingStore>
