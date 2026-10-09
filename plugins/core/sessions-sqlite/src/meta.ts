import type { Server, SessionMeta, SessionMetaUpdate } from '@sand/protocol'
import type { Database } from 'bun:sqlite'

type Row = Omit<SessionMeta, 'pinned'> & { pinned: number }

export const sessionMeta = (db: Database) => {
  const read = db.query<Row, { id: string }>('select pinned, settled, seen, position from sessions where id = $id')
  const pin = db.query('update sessions set pinned = $pinned, settled = case when $pinned then null else settled end where id = $id')
  const settle = db.query('update sessions set settled = $now, pinned = 0 where id = $id')
  const unsettle = db.query('update sessions set settled = null where id = $id')
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

export const serveMeta = (server: Server, meta: ReturnType<typeof sessionMeta>) => {
  const publish = (update: SessionMetaUpdate) => {
    server.broadcast('session.meta', [update])
    return update
  }
  const handlers = [
    server.handle('session.pin', request => publish(meta.pin(String(request.session), Boolean(request.pinned)))),
    server.handle('session.settle', request => publish(meta.settle(String(request.session), Boolean(request.settled)))),
    server.handle('session.seen', request => publish(meta.see(String(request.session), Number(request.at)))),
    server.handle('session.move', request => publish(meta.move(String(request.session), Number(request.position)))),
  ]
  return () => handlers.forEach(dispose => void dispose())
}
