import type { Effort, NativeRef, Speed } from '@sand/accounts/contract'
import type { Selection } from '@sand/model/contract'
import type { ConversationRef, Owner } from '@sand/engine/contract'
import type { Database } from 'bun:sqlite'
import type { ProviderThreadInfo, Segment, ThreadStatus } from '../contract'
import { type Key, keyOf } from './key'

interface Row {
  id: string
  owner: Owner
  conversation: string
  source: string
  model: string
  generation: number
  native: string | null
  status: ThreadStatus
  system: string
  seen: string
  effort: Effort | null
  speed: Speed
  context: number
  context_window: number | null
  used: number
  created: number
}

export interface NewThread {
  conversation: ConversationRef
  selection: Selection
  system: string
  seen: Segment[]
  context?: number
  window?: number
  used: number
}

export interface Settled {
  seen: Segment[]
  context: number
  window?: number
  native?: NativeRef
}

const infoOf = (row: Row): ProviderThreadInfo => ({
  id: row.id,
  owner: row.owner,
  conversation: row.conversation,
  source: row.source,
  model: row.model,
  generation: row.generation,
  ...(row.native && { native: JSON.parse(row.native) }),
  status: row.status,
  system: row.system,
  seen: JSON.parse(row.seen),
  ...(row.effort && { effort: row.effort }),
  speed: row.speed,
  context: row.context,
  ...(row.context_window && { window: row.context_window }),
  used: row.used,
  created: row.created,
})

const insertSql = `insert into provider_threads (id, owner, conversation, source, model, generation, status, system, seen, effort, speed, context, context_window, used, created)
  values ($id, $owner, $conversation, $source, $model,
    (select coalesce(max(generation), 0) + 1 from provider_threads
      where owner = $owner and conversation = $conversation and model = $model),
    'idle', $system, $seen, $effort, $speed, $context, $window, $used, $created)
  returning *`

export const createThreadStore = (db: Database) => {
  const insert = db.query<Row, Record<string, string | number | null>>(insertSql)
  const any = db.query<{ id: string }, Key>('select id from provider_threads where owner = $owner and conversation = $conversation limit 1')
  const open = db.query<Row, Key>(
    "select * from provider_threads where owner = $owner and conversation = $conversation and status != 'retired' order by used desc",
  )
  const activated = db.query("update provider_threads set status = 'active', used = $used, source = $source, effort = $effort, speed = $speed where id = $id")
  const settled = db.query("update provider_threads set status = 'idle', seen = $seen, context = $context, context_window = coalesce($window, context_window), native = coalesce($native, native) where id = $id")
  const saw = db.query('update provider_threads set seen = $seen where id = $id')
  const sized = db.query('update provider_threads set context_window = $window where id = $id')
  const briefed = db.query('update provider_threads set system = $system where id = $id')
  const retired = db.query("update provider_threads set status = 'retired' where id = $id")
  const doubted = db.query("update provider_threads set status = 'uncertain' where id = $id and native is not null and status != 'retired'")
  const removed = db.query('delete from provider_threads where owner = $owner and conversation = $conversation')
  const nativeRows = db.query<{ native: string }, []>('select distinct native from provider_threads where native is not null')

  return {
    open: (conversation: ConversationRef) => open.all(keyOf(conversation)).map(infoOf),
    known: (conversation: ConversationRef) => !!any.get(keyOf(conversation)),
    create({ conversation, selection, system, seen, context = 0, window, used }: NewThread) {
      const row = insert.get({
        id: Bun.randomUUIDv7(),
        ...keyOf(conversation),
        source: selection.source,
        model: selection.model,
        system,
        seen: JSON.stringify(seen),
        effort: selection.effort ?? null,
        speed: selection.speed,
        context,
        window: window ?? null,
        used,
        created: Date.now(),
      })
      return infoOf(row!)
    },
    activate: (id: string, { source, effort, speed }: Selection) => void activated.run({ id, used: Date.now(), source, effort: effort ?? null, speed }),
    settle: (id: string, { seen, context, window, native }: Settled) =>
      void settled.run({ id, seen: JSON.stringify(seen), context, window: window ?? null, native: native ? JSON.stringify(native) : null }),
    see: (id: string, seen: Segment[]) => void saw.run({ id, seen: JSON.stringify(seen) }),
    size: (id: string, window: number) => void sized.run({ id, window }),
    rebrief: (id: string, system: string) => void briefed.run({ id, system }),
    retire: (id: string) => void retired.run({ id }),
    doubt: (id: string) => void doubted.run({ id }),
    remove: (conversation: ConversationRef) => void removed.run(keyOf(conversation)),
    natives: () => new Set(nativeRows.all().map(row => (JSON.parse(row.native) as NativeRef).id)),
  }
}

export type ThreadStore = ReturnType<typeof createThreadStore>
