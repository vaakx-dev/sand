import { turnEnd, turnStart } from '@sand/loop/contract'
import { paths } from '@sand/paths/contract'
import { projectFiles } from '@sand/project/contract'
import { runtimeRelease } from '@sand/host-runtimes/contract'
import { expandHome } from '@sand/util/fs'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { sessionClosing, sessionEntry, sessionRemove, sessions, sessionUpdate } from './contract'
import { open } from './db'
import { createStore } from './store'

export default definePlugin({
  name: 'chats',
  description: "Stores each project's threads, their sub-agents and quick task chats, in SQLite",
  inject: { paths, projectFiles },
  config: z.object({ path: z.string().optional() }),
  apply(ctx, config) {
    const { home } = ctx.paths
    const db = open(config.path ? expandHome(config.path, home) : join(home, 'sand.db'))
    ctx.effect(() => () => db.close())
    const running = new Set<string>()
    ctx.on(turnStart, session => void running.add(session.id))
    ctx.on(turnEnd, session => {
      running.delete(session.id)
      if (session.kind !== 'agent') store.sessions.update(session.id, { seen: false })
    })

    const store = createStore(db, {
      hooks: {
        entry: (session, entry) => ctx.emit(sessionEntry, session, entry),
        update: session => ctx.emit(sessionUpdate, session),
        remove: id => ctx.emit(sessionRemove, id),
      },
      running: id => running.has(id),
      closing: session => ctx.bail(sessionClosing, session),
      projectOf: cwd => ctx.projectFiles.ofFolder(cwd),
      scratch: id => join(home, 'scratch', id),
    })
    ctx.provide(sessions, store.sessions)
    ctx.on(runtimeRelease, ids => ids.forEach(store.forget))
  },
})
