import type { Effort, Speed, Usage } from '@sand/accounts/contract'
import type { Message } from '@sand/chats/contract'
import type { Selection } from '@sand/model/contract'
import { emptyUsage } from '@sand/usage/contract'
import type { Database } from 'bun:sqlite'
import type { ConversationRef, Owner, TurnEnding, TurnInfo, TurnOrigin, TurnStatus, WaitReason } from '../contract'
import { keyOf } from './key'

interface Row {
  id: string
  owner: Owner
  conversation: string
  ordinal: number
  status: TurnStatus
  origin: TurnOrigin
  source: string
  model: string
  effort: Effort | null
  speed: Speed
  provider_thread: string | null
  prompt: string
  step: number
  usage: string
  partial: string | null
  outputs: string | null
  recoveries: number
  handed: number
  lease: number
  waiting: string | null
  stop_reason: TurnEnding['stopReason'] | null
  error: string | null
  detail: string | null
  started: number
  ended: number | null
  pending: string | null
}

export interface NewTurn {
  id: string
  conversation: ConversationRef
  origin: TurnOrigin
  selection: Selection
  prompt: string
  holder: string
  lease: number
  started: number
  pending?: string
}

export interface Ending {
  status: TurnStatus
  stopReason: TurnEnding['stopReason']
  error?: string
  detail?: string
}

export interface Stale {
  id: string
  owner: Owner
  conversation: string
  thread?: string
  partial?: Message
  outputs: Record<string, string>
  recoveries: number
  handed?: { at: number }
}

type StaleRow = Pick<Row, 'id' | 'owner' | 'conversation' | 'provider_thread' | 'partial' | 'outputs' | 'recoveries' | 'handed' | 'lease'>

const waitsOf = (waiting: string | null): WaitReason[] => (waiting ? JSON.parse(waiting) : [])

const infoOf = (row: Row): TurnInfo => {
  const waiting = waitsOf(row.waiting).at(-1)
  return {
    id: row.id,
    owner: row.owner,
    conversation: row.conversation,
    ordinal: row.ordinal,
    status: row.status,
    origin: row.origin,
    selection: { source: row.source, model: row.model, ...(row.effort && { effort: row.effort }), speed: row.speed },
    ...(row.provider_thread && { providerThread: row.provider_thread }),
    prompt: row.prompt,
    step: row.step,
    usage: JSON.parse(row.usage),
    ...(waiting && { waiting }),
    ...(row.stop_reason && { stopReason: row.stop_reason }),
    ...(row.error && { error: row.error }),
    ...(row.detail && { detail: row.detail }),
    started: row.started,
    ...(row.ended !== null && { ended: row.ended }),
  }
}

const staleOf = (row: StaleRow): Stale => ({
  id: row.id,
  owner: row.owner,
  conversation: row.conversation,
  ...(row.provider_thread && { thread: row.provider_thread }),
  ...(row.partial && { partial: JSON.parse(row.partial) }),
  outputs: row.outputs ? JSON.parse(row.outputs) : {},
  recoveries: row.recoveries,
  ...(row.handed && { handed: { at: row.lease } }),
})

const insertSql = `insert into turns (id, owner, conversation, ordinal, status, origin, source, model, effort, speed, prompt, holder, lease, usage, started, pending)
  values ($id, $owner, $conversation, (select coalesce(max(ordinal), 0) + 1 from turns where owner = $owner and conversation = $conversation), 'running',
    $origin, $source, $model, $effort, $speed, $prompt, $holder, $lease, $usage, $started, $pending)
  returning *`

const finishSql = `update turns set status = $status, stop_reason = $stopReason, error = $error, detail = $detail, ended = $ended, partial = null, outputs = null
  where id = $id and holder = $holder and ended is null`

type Key = ReturnType<typeof keyOf>

export const createTurnStore = (db: Database) => {
  const insert = db.query<Row, Record<string, string | number | null>>(insertSql)
  const byId = db.query<Row, { id: string; owner: Owner }>('select * from turns where id = $id and owner = $owner')
  const open = db.query<Row, Key & { now: number }>(
    'select * from turns where owner = $owner and conversation = $conversation and ended is null and lease > $now order by ordinal desc limit 1',
  )
  const live = db.query<Row, { owner: Owner; now: number }>('select * from turns where owner = $owner and ended is null and lease > $now')
  const opened = db.query<{ id: string }, Key & { pending: string }>('select id from turns where owner = $owner and conversation = $conversation and pending = $pending')
  const listed = db.query<Row, Key & { before: number; limit: number }>(
    'select * from turns where owner = $owner and conversation = $conversation and ordinal < $before order by ordinal desc limit $limit',
  )
  const waited = db.query('update turns set status = $status, waiting = $waiting where id = $id and holder = $holder and ended is null')
  const stepped = db.query('update turns set step = step + 1 where id = $id')
  const threaded = db.query('update turns set provider_thread = $thread where id = $id')
  const used = db.query('update turns set usage = $usage, partial = null, recoveries = 0 where id = $id')
  const written = db.query('update turns set partial = $partial where id = $id')
  const outputted = db.query('update turns set outputs = $outputs where id = $id')
  const finished = db.query(finishSql)
  const renewed = db.query<{ id: string; cancel: number }, { holder: string; lease: number }>(
    'update turns set lease = $lease where holder = $holder and ended is null returning id, cancel',
  )
  const cancelled = db.query('update turns set cancel = 1 where id = $id and ended is null')
  const expired = db.query<StaleRow, { owner: Owner; holder: string; now: number }>(
    'select id, owner, conversation, provider_thread, partial, outputs, recoveries, handed, lease from turns where owner = $owner and ended is null and lease <= $now and holder != $holder',
  )
  const handedOver = db.query('update turns set handed = 1, lease = $now where id = $id and holder = $holder and ended is null and cancel = 0')
  const adopted = db.query<Row, { id: string; holder: string; lease: number; now: number }>(
    `update turns set holder = $holder, lease = $lease, status = 'running', waiting = null, recoveries = recoveries + 1 - handed, handed = 0
      where id = $id and ended is null and lease <= $now and cancel = 0
        and not exists (select 1 from turns later where later.owner = turns.owner and later.conversation = turns.conversation and later.ordinal > turns.ordinal)
      returning *`,
  )
  const removed = db.query('delete from turns where owner = $owner and conversation = $conversation')
  const lost = db.query(
    "update turns set status = 'lost', stop_reason = 'lost', ended = $now, partial = null, outputs = null where id = $id and ended is null and lease <= $now",
  )

  return {
    open({ selection, conversation, pending, ...turn }: NewTurn) {
      const row = insert.get({
        ...turn,
        pending: pending ?? null,
        ...keyOf(conversation),
        source: selection.source,
        model: selection.model,
        effort: selection.effort ?? null,
        speed: selection.speed,
        usage: JSON.stringify(emptyUsage()),
      })
      return infoOf(row!)
    },
    current(conversation: ConversationRef) {
      const row = open.get({ ...keyOf(conversation), now: Date.now() })
      return row ? infoOf(row) : undefined
    },
    get(owner: Owner, id: string) {
      const row = byId.get({ id, owner })
      return row ? infoOf(row) : undefined
    },
    from: (conversation: ConversationRef, pending: string) => opened.get({ ...keyOf(conversation), pending })?.id,
    live: (owner: Owner) => live.all({ owner, now: Date.now() }).map(infoOf),
    list: (conversation: ConversationRef, before = Number.MAX_SAFE_INTEGER, limit = 20) =>
      listed.all({ ...keyOf(conversation), before, limit }).map(infoOf),
    wait: (id: string, holder: string, reasons: WaitReason[]) =>
      void waited.run({
        id,
        holder,
        status: reasons.length ? 'waiting' : 'running',
        waiting: reasons.length ? JSON.stringify(reasons) : null,
      }),
    step: (id: string) => void stepped.run({ id }),
    thread: (id: string, thread: string) => void threaded.run({ id, thread }),
    usage: (id: string, usage: Usage) => void used.run({ id, usage: JSON.stringify(usage) }),
    partial: (id: string, message: Message | undefined) =>
      void written.run({
        id,
        partial: message ? JSON.stringify(message) : null,
      }),
    outputs: (id: string, outputs: Map<string, string>) => void outputted.run({ id, outputs: JSON.stringify(Object.fromEntries(outputs)) }),
    finish: (id: string, holder: string, { status, stopReason, error, detail }: Ending) =>
      finished.run({
        id,
        holder,
        status,
        stopReason,
        error: error ?? null,
        detail: detail ?? null,
        ended: Date.now(),
      }).changes > 0,
    renew: (holder: string, lease: number) => renewed.all({ holder, lease }),
    cancel: (id: string) => void cancelled.run({ id }),
    expired: (owner: Owner, holder: string) => expired.all({ owner, holder, now: Date.now() }).map(staleOf),
    lose: (id: string) => lost.run({ id, now: Date.now() }).changes > 0,
    handOver: (id: string, holder: string) => handedOver.run({ id, holder, now: Date.now() }).changes > 0,
    adopt(id: string, holder: string, lease: number) {
      const row = adopted.get({ id, holder, lease, now: Date.now() })
      return row ? infoOf(row) : undefined
    },
    remove: (conversation: ConversationRef) => void removed.run(keyOf(conversation)),
  }
}

export type TurnStore = ReturnType<typeof createTurnStore>
