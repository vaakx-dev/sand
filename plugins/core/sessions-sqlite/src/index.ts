import type { Entry } from '@sand/messages'
import type { Session, SessionInfo, Sessions } from './contract'
import { expandHome } from '@sand/kit/fs'
import type {} from '@sand/paths/contract'
import type {} from '@sand/project-files/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { open } from './db'
import { rewriter } from './format/rewrite'
import { current, upgrade } from './format/upgrade'
import { remover, summaries } from './list'
import { serveMeta, sessionMeta } from './meta'
import { assignProjects } from './projects'
import { createSession } from './session'

export default definePlugin({
  name: 'sessions-sqlite',
  inject: ['paths', 'projectFiles'],
  config: z.object({ path: z.string().optional() }),
  apply(ctx, config) {
    const { paths, projectFiles } = ctx
    const { home } = paths
    const db = open(config.path ? expandHome(config.path, home) : join(home, 'sand.db'))
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
      'insert into sessions (id, created, cwd, project, title, head, parent, origin, kind, format, seen, position) values ($id, $created, $cwd, $project, $title, $head, $parent, $origin, $kind, $format, $created, $created)',
    )
    const rewrite = rewriter(db)
    const find = db.query<SessionInfo, { id: string }>('select * from sessions where id = $id')
    const list = summaries(db)
    const removeAll = remover(db)
    const ofType = db.query<Entry & { data: string }, { type: string }>('select * from entries where type = $type order by at')

    const sessions: Sessions = {
      create({ id = Bun.randomUUIDv7(), cwd, project, title, parent, origin, kind }) {
        const info: SessionInfo = {
          id,
          created: Date.now(),
          cwd: cwd || paths.scratchFolder(id),
          project: cwd ? (project !== undefined ? project : projectFiles.ofFolder(cwd)) : null,
          title: title ?? null,
          head: null,
          parent: parent ?? null,
          origin: origin ?? null,
          kind: kind ?? 'main',
          format: current,
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
        if (!info) return undefined
        return remember((info.format ?? 1) < current ? rewrite(info) : info)
      },
      branch(source, id, at) {
        const title = source.title ? `${source.title} (branch)` : undefined
        const copy = sessions.create({ id, cwd: source.cwd, project: source.project, title, parent: source.id, kind: 'branch' })
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
      format: current,
      upgrade,
    }
    ctx.provide('sessions', sessions)
    ctx.on('server.hello', hello => ({ ...hello, scratch: paths.scratchRoot() }))
    ctx.on('runtime.release', ids => {
      for (const id of ids) opened.delete(id)
    })
    const meta = sessionMeta(db)
    ctx.watch('server', server => (server ? serveMeta(server, meta) : undefined))
    assignProjects(db, projectFiles)
    ctx.effect(() =>
      projectFiles.onChange(() => {
        for (const { id, project } of assignProjects(db, projectFiles)) {
          const cached = opened.get(id)
          if (cached) cached.project = project
          const session = sessions.open(id)
          if (session) hooks.update(session)
        }
      }),
    )
  },
})
