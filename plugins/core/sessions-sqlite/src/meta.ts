import type { Server } from '@sand/server/contract'
import type { SessionMeta, SessionMetaUpdate } from './contract'
import type { Database } from 'bun:sqlite'

type Row = Omit<SessionMeta, 'pinned'> & { pinned: number }

export const sessionMeta = (db: Database) => {
  const read = db.query<Row, { id: string }>('select pinned, settled, snoozed, seen, position from sessions where id = $id')
  const pin = db.query('update sessions set pinned = $pinned, settled = case when $pinned then null else settled end, snoozed = case when $pinned then null else snoozed end where id = $id')
  const settle = db.query('update sessions set settled = $now, pinned = 0, snoozed = null where id = $id')
  const unsettle = db.query('update sessions set settled = null where id = $id')
  const snooze = db.query('update sessions set snoozed = $until, settled = case when $until is null then settled else null end where id = $id')
  const see = db.query('update sessions set seen = max(seen, $at) where id = $id')
  const move = db.query('update sessions set position = $position where id = $id')

  const get = (id: string): SessionMetaUpdate => {
    const row = read.get({ id })
    if (!row) throw new Error(`No thread ${id}`)
    return { id, ...row, pinned: Boolean(row.pinned) }
  }

  return {
    pin(id: string, pinned: boolean) {
      pin.run({ id, pinned: pinned ? 1 : 0 })
      return get(id)
    },
    settle(id: string, settled: boolean) {
      if (settled) settle.run({ id, now: Date.now() })
      else unsettle.run({ id })
      return get(id)
    },
    snooze(id: string, until: number | null) {
      snooze.run({ id, until })
      return get(id)
    },
    see(id: string, at: number) {
      see.run({ id, at })
      return get(id)
    },
    move(id: string, position: number) {
      move.run({ id, position })
      return get(id)
    },
  }
}

const untilOf = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

export const serveMeta = (server: Server, meta: ReturnType<typeof sessionMeta>) => {
  const publish = (update: SessionMetaUpdate) => {
    server.broadcast('session.meta', [update])
    return update
  }
  const handlers = [
    server.handle('session.pin', request => publish(meta.pin(String(request.session), Boolean(request.pinned)))),
    server.handle('session.settle', request => publish(meta.settle(String(request.session), Boolean(request.settled)))),
    server.handle('session.snooze', request => publish(meta.snooze(String(request.session), untilOf(request.until)))),
    server.handle('session.seen', request => publish(meta.see(String(request.session), Number(request.at)))),
    server.handle('session.move', request => publish(meta.move(String(request.session), Number(request.position)))),
  ]
  return () => handlers.forEach(dispose => void dispose())
}
