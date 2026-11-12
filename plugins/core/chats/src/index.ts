import { media } from '@sand/media/contract'
import { paths } from '@sand/paths/contract'
import { projectFiles } from '@sand/project/contract'
import { runtimeRelease } from '@sand/host-runtimes/contract'
import { ledger } from '@sand/ledger/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { sessionBusy, sessionClosing, sessionEntry, sessionRemove, sessions, sessionSettle, sessionUpdate } from './contract'
import { migrateChats } from './schema'
import { usedMedia } from './media'
import { createStore } from './store'

export default definePlugin({
  name: 'chats',
  description: "Stores each project's threads, their subagents and quick task chats, in SQLite",
  inject: { paths, projectFiles, media, ledger },
  apply(ctx) {
    const { home } = ctx.paths
    migrateChats(ctx.ledger)
    const { db } = ctx.ledger
    ctx.effect(() => ctx.media.inUse(usedMedia(db)))
    const store = createStore(db, {
      hooks: {
        entry: (session, entry) => ctx.emit(sessionEntry, session, entry),
        update: session => ctx.emit(sessionUpdate, session),
        settle: session => ctx.emit(sessionSettle, session),
        remove: id => ctx.emit(sessionRemove, id),
      },
      busy: async session => (await ctx.bail(sessionBusy, session)) ?? false,
      closing: session => ctx.bail(sessionClosing, session),
      projectOf: cwd => ctx.projectFiles.ofFolder(cwd),
      knownProject: id => ctx.projectFiles.copies().some(copy => copy.project === id),
      scratch: id => join(home, 'scratch', id),
    })
    ctx.provide(sessions, store.sessions)
    ctx.on(runtimeRelease, ids => ids.forEach(store.forget))
  },
})
