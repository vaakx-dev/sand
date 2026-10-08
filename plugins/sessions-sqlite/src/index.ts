import type { Entry, Session, SessionInfo, Sessions } from '@sand/protocol'
import { expandHome } from '@sand/host'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { open } from './db'
import { remover, summaries } from './list'
import { serveMeta, sessionMeta } from './meta'
import { createSession } from './session'

export default definePlugin({
  name: 'sessions-sqlite',
  config: z.object({ path: z.string().default('~/.sand/sand.db') }),
  apply(ctx, config) {
    const db = open(expandHome(config.path))
    ctx.effect(() => () => db.close())
    const opened = new Map<string, Session>()
    const hooks = {
      entry: (session: Session, entry: Entry) => ctx.emit('session.entry', session, entry),
      update: (session: Session) => ctx.emit('session.update', session),
    }
    const remember = (info: SessionInfo) => {
      const session = createSession(db, info, hooks)
      opened.set(info.id, session)
      return session
    }
    const insert = db.query(
      'insert into sessions (id, created, cwd, title, head, parent, origin, kind, seen, position) values ($id, $created, $cwd, $title, $head, $parent, $origin, $kind, $created, $created)',
    )
    const find = db.query<SessionInfo, { id: string }>('select * from sessions where id = $id')
    const list = summaries(db)
    const removeAll = remover(db)
    const ofType = db.query<Entry & { data: string }, { type: string }>('select * from entries where type = $type order by at')

    const sessions: Sessions = {
      create({ id, cwd, title, parent, origin, kind }) {
        const info: SessionInfo = {
          id: id ?? Bun.randomUUIDv7(),
          created: Date.now(),
          cwd,
          title: title ?? null,
          head: null,
          parent: parent ?? null,
          origin: origin ?? null,
          kind: kind ?? 'main',
        }
        insert.run({ ...info })
        const session = remember(info)
        hooks.update(session)
        return session
      },
      open(id) {
        const cached = opened.get(id)
        if (cached) return cached
        const info = find.get({ id })
        return info ? remember(info) : undefined
      },
      branch(source, id, at) {
        const title = source.title ? `${source.title} (branch)` : undefined
        const copy = sessions.create({ id, cwd: source.cwd, title, parent: source.id, kind: 'branch' })
        const path = source.path()
        const end = at === undefined ? path.length : path.findIndex(entry => entry.id === at) + 1
        for (const entry of path.slice(0, end)) copy.append(entry.type, entry.data)
        return copy
      },
      list,
      entriesOfType: type => ofType.all({ type }).map(row => ({ ...row, data: JSON.parse(row.data) })),
      remove(id) {
        const session = sessions.open(id)
        if (!session) return
        for (const removed of removeAll(id)) opened.delete(removed)
        ctx.emit('session.remove', session)
      },
    }
    ctx.provide('sessions', sessions)
    const meta = sessionMeta(db)
    ctx.watch('server', server => (server ? serveMeta(server, meta) : undefined))
  },
})
