import { bots } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'
import type { Actor } from '@sand/host-hub/contract'
import { ledger } from '@sand/ledger/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { type Author, logbookAdd, logbookChange, logbookChanged, logbookRemove, logbookSearch, logbookTags, type Revision } from './contract'
import { Store } from './store'
import { syncAcrossPcs } from './sync'
import { offerLogbookTools } from './tools'

export default definePlugin({
  name: 'logbook',
  description: 'Keeps the Logbook, the dated record of finished work, in sand.db: threads, bots, outside agents and the page add to it, search it, change it and remove from it, and it stays the same on all your PCs',
  inject: { ledger, sessions },
  apply(ctx) {
    const store = new Store(ctx.ledger)
    const changed = (ids: string[]) => ctx.get(server)?.broadcast(logbookChanged, ids)
    const sync = syncAcrossPcs(ctx, { store, taken: changed })

    const saved = <R extends Revision>(revision: R) => {
      sync.push(revision)
      changed([revision.id])
      return revision
    }

    const bot = (id: string) => ctx.get(bots)?.get(id)

    const nameOf = ({ owner, id }: Actor) => (owner === 'thread' ? ctx.sessions.open(id)?.title : bot(id)?.name) ?? ''

    const authorOf = (actor: Actor | undefined): Author | null => (actor ? { ...actor, name: nameOf(actor) } : null)

    const projectOf = (actor: Actor | undefined) => {
      if (actor?.owner === 'thread') return ctx.sessions.open(actor.id)?.project ?? null
      const projects = actor ? (bot(actor.id)?.projects ?? []) : []
      return projects.length === 1 ? (projects[0] ?? null) : null
    }

    ctx.watch(mcpTools, found => found && offerLogbookTools(found))
    ctx.watch(
      server,
      found =>
        found &&
        joinDisposers(
          sync.serve(found),
          found.handle(logbookAdd, ({ project, title, details = '', links = [], tags = [] }, { actor }) =>
            saved(store.add({ project: project === undefined ? projectOf(actor) : project, title, details, links, tags }, authorOf(actor))),
          ),
          found.handle(logbookChange, ({ id, ...patch }) => saved(store.change(id, patch))),
          found.handle(logbookRemove, ({ id }) => void saved(store.remove(id))),
          found.handle(logbookSearch, search => store.search(search)),
          found.handle(logbookTags, ({ project }) => store.tags(project)),
        ),
    )
  },
})
