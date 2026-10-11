import { expandHome } from '@sand/kit/fs'
import type {} from '@sand/paths/contract'
import type {} from '@sand/project-files/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { open } from './db'
import { serveMeta, sessionMeta } from './meta'
import { assignProjects } from './projects'
import { createStore } from './store'

export default definePlugin({
  name: 'sessions-sqlite',
  inject: ['paths', 'projectFiles'],
  config: z.object({ path: z.string().optional() }),
  apply(ctx, config) {
    const { paths, projectFiles } = ctx
    const db = open(config.path ? expandHome(config.path, paths.home) : join(paths.home, 'sand.db'))
    ctx.effect(() => () => db.close())
    const running = new Set<string>()
    ctx.on('turn.start', session => void running.add(session.id))
    ctx.on('turn.end', session => void running.delete(session.id))

    const { sessions, forget } = createStore(db, {
      hooks: {
        entry: (session, entry) => ctx.emit('session.entry', session, entry),
        update: session => ctx.emit('session.update', session),
        remove: session => ctx.emit('session.remove', session),
      },
      running: id => running.has(id),
      scratchFolder: id => paths.scratchFolder(id),
      projectOf: cwd => projectFiles.ofFolder(cwd),
    })
    ctx.provide('sessions', sessions)
    ctx.on('server.hello', hello => ({ ...hello, scratch: paths.scratchRoot() }))
    ctx.on('runtime.release', ids => ids.forEach(forget))

    const meta = sessionMeta(db)
    ctx.watch('server', server => (server ? serveMeta(server, meta) : undefined))

    assignProjects(db, projectFiles)
    ctx.effect(() =>
      projectFiles.onChange(() => {
        for (const { id, project } of assignProjects(db, projectFiles)) {
          const session = sessions.open(id)
          if (!session) continue
          session.project = project
          ctx.emit('session.update', session)
        }
      }),
    )
  },
})
