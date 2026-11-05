import type { Effort, Speed, Usage } from '@sand/accounts/contract'
import type { Message } from '@sand/chats/contract'
import type { Selection } from '@sand/model/contract'
import type { TurnEnding, TurnInfo, TurnOrigin, TurnStatus, WaitReason } from '@sand/turns-contract/contract'
import { emptyUsage } from '@sand/usage/contract'
import type { Database } from 'bun:sqlite'

interface Row {
  id: string
  session: string
  ordinal: number
  status: TurnStatus
  origin: TurnOrigin
  source: string
  model: string
  effort: Effort | null
  speed: Speed
  prompt: string
  step: number
  usage: string
  partial: string | null
  waiting: string | null
  stop_reason: TurnEnding['stopReason'] | null
  error: string | null
  detail: string | null
  started: number
  ended: number | null
}

export interface NewTurn {
  id: string
  session: string
  origin: TurnOrigin
  selection: Selection
  prompt: string
  owner: string
  lease: number
  started: number
}

export interface Ending {
  status: TurnStatus
  stopReason: TurnEnding['stopReason']
  error?: string
  detail?: string
}

export interface Stale {
  id: string
  session: string
  partial?: Message
}

const infoOf = (row: Row): TurnInfo => ({
  id: row.id,
  session: row.session,
  ordinal: row.ordinal,
  status: row.status,
  origin: row.origin,
  selection: { source: row.source, model: row.model, ...(row.effort && { effort: row.effort }), speed: row.speed },
  prompt: row.prompt,
  step: row.step,
  usage: JSON.parse(row.usage),
  ...(row.waiting && { waiting: JSON.parse(row.waiting) }),
  ...(row.stop_reason && { stopReason: row.stop_reason }),
  ...(row.error && { error: row.error }),
  ...(row.detail && { detail: row.detail }),
  started: row.started,
  ...(row.ended !== null && { ended: row.ended }),
})

const staleOf = (row: Pick<Row, 'id' | 'session' | 'partial'>): Stale => ({
  id: row.id,
  session: row.session,
  ...(row.partial && { partial: JSON.parse(row.partial) }),
})

const insertSql = `insert into turns (id, session, ordinal, status, origin, source, model, effort, speed, prompt, owner, lease, usage, started)
  values ($id, $session, (select coalesce(max(ordinal), 0) + 1 from turns where session = $session), 'running', $origin,
    $source, $model, $effort, $speed, $prompt, $owner, $lease, $usage, $started)
  returning *`

const finishSql = `update turns set status = $status, stop_reason = $stopReason, error = $error, detail = $detail, ended = $ended, partial = null
  where id = $id and owner = $owner and ended is null`

export const createTurnStore = (db: Database) => {
  const insert = db.query<Row, Record<string, string | number | null>>(insertSql)
  const byId = db.query<Row, { id: string }>('select * from turns where id = $id')
  const open = db.query<Row, { session: string; now: number }>(
    'select * from turns where session = $session and ended is null and lease > $now order by ordinal desc limit 1',
  )
  const live = db.query<Row, { now: number }>('select * from turns where ended is null and lease > $now')
  const listed = db.query<Row, { session: string; before: number; limit: number }>(
    'select * from turns where session = $session and ordinal < $before order by ordinal desc limit $limit',
  )
  const waited = db.query('update turns set status = $status, waiting = $waiting where id = $id and ended is null')
  const stepped = db.query('update turns set step = step + 1 where id = $id')
  const used = db.query('update turns set usage = $usage, partial = null where id = $id')
  const written = db.query('update turns set partial = $partial where id = $id')
  const finished = db.query(finishSql)
  const renewed = db.query<{ id: string; cancel: number }, { owner: string; lease: number }>(
    'update turns set lease = $lease where owner = $owner and ended is null returning id, cancel',
  )
  const cancelled = db.query('update turns set cancel = 1 where id = $id and ended is null')
  const expired = db.query<Pick<Row, 'id' | 'session' | 'partial'>, { owner: string; now: number }>(
    'select id, session, partial from turns where ended is null and lease <= $now and owner != $owner',
  )
  const removed = db.query('delete from turns where session = $session')
  const lost = db.query(
    "update turns set status = 'lost', stop_reason = 'lost', ended = $now, partial = null where id = $id and ended is null and lease <= $now",
  )

  return {
    open({ selection, ...turn }: NewTurn) {
      const row = insert.get({
        ...turn,
        source: selection.source,
        model: selection.model,
        effort: selection.effort ?? null,
        speed: selection.speed,
        usage: JSON.stringify(emptyUsage()),
      })
      return infoOf(row!)
    },
    current(session: string) {
      const row = open.get({ session, now: Date.now() })
      return row ? infoOf(row) : undefined
    },
    get(id: string) {
      const row = byId.get({ id })
      return row ? infoOf(row) : undefined
    },
    live: () => live.all({ now: Date.now() }).map(infoOf),
    list: (session: string, before = Number.MAX_SAFE_INTEGER, limit = 20) => listed.all({ session, before, limit }).map(infoOf),
    wait: (id: string, reason: WaitReason | undefined) =>
      void waited.run({ id, status: reason ? 'waiting' : 'running', waiting: reason ? JSON.stringify(reason) : null }),
    step: (id: string) => void stepped.run({ id }),
    usage: (id: string, usage: Usage) => void used.run({ id, usage: JSON.stringify(usage) }),
    partial: (id: string, message: Message | undefined) => void written.run({ id, partial: message ? JSON.stringify(message) : null }),
    finish: (id: string, owner: string, { status, stopReason, error, detail }: Ending) =>
      finished.run({ id, owner, status, stopReason, error: error ?? null, detail: detail ?? null, ended: Date.now() }).changes > 0,
    renew: (owner: string, lease: number) => renewed.all({ owner, lease }),
    cancel: (id: string) => void cancelled.run({ id }),
    expired: (owner: string) => expired.all({ owner, now: Date.now() }).map(staleOf),
    lose: (id: string) => lost.run({ id, now: Date.now() }).changes > 0,
    remove: (session: string) => void removed.run({ session }),
  }
}

export type TurnStore = ReturnType<typeof createTurnStore>
