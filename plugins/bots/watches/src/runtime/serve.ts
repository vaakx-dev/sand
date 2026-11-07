import type { Actor } from '@sand/host-hub/contract'
import { failure } from '@sand/orchestrator/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { type Watch, watchChange, watchRemove } from '@sand/watches/contract'
import { z } from 'zod'
import { type BotWatchKind, botWatchCreate, botWatchesChangeWire, botWatchKinds, botWatchList, botWatchRemove } from '../contract'
import type { BotWatchesContext } from './context'
import { botWatchOf, owner } from './view'

const callerBot = (actor: Actor | undefined) => (actor?.owner === 'bot' ? actor.id : undefined)

export const serveWatches = (ctx: BotWatchesContext, server: Server) => {
  const listed = (bot?: string) => {
    const kinds = ctx.watches.kinds()
    return ctx.watches.list(owner, bot).map(watch => botWatchOf(watch, kinds))
  }

  const announce = (watch: Watch) => {
    if (watch.owner === owner) server.broadcast(botWatchesChangeWire, [watch.subject, listed(watch.subject)])
  }

  const botOf = (bot: string | undefined, actor: Actor | undefined) => {
    const id = bot ?? callerBot(actor)
    if (!id) throw failure('invalid_request', 'Name the bot')
    if (!ctx.bots.get(id)) throw failure('not_found', `No bot ${id}`)
    return id
  }

  const remove = (id: string) => {
    if (ctx.watches.get(id)?.owner !== owner) throw failure('not_found', `No watch ${id}`)
    return ctx.watches.remove(id)
  }

  const kindsOf = (): BotWatchKind[] =>
    ctx.watches.kinds().map(({ name, label, description, input }) => ({ kind: name, label, description, input: z.toJSONSchema(input) }))

  return joinDisposers(
    server.handle(botWatchList, ({ bot }, { actor }) => listed(bot ?? callerBot(actor))),
    server.handle(botWatchCreate, async ({ bot, label, instructions, kind, input }, { actor }) => {
      const watch = await ctx.watches.create({ owner, subject: botOf(bot, actor), kind, input, label, data: { instructions } })
      return botWatchOf(watch, ctx.watches.kinds())
    }),
    server.handle(botWatchRemove, ({ watch }) => remove(watch)),
    server.handle(botWatchKinds, kindsOf),
    ctx.on(watchChange, announce),
    ctx.on(watchRemove, announce),
  )
}
