import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import {
  botChange,
  botChangeWire,
  botConversation,
  botCreate,
  botDelete,
  botEntry,
  botEntryWire,
  botGet,
  botJobs,
  botList,
  botRemove,
  botRemoveWire,
  type Bots,
  botUpdate,
  helloBots,
} from './contract'

export const serveBots = (ctx: Context, service: Bots) =>
  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.hello(helloBots, () => service.list()),
      found.handle(botList, () => service.list()),
      found.handle(botGet, ({ bot }) => service.get(bot) ?? null),
      found.handle(botCreate, spec => service.create(spec)),
      found.handle(botUpdate, ({ bot, patch }) => service.update(bot, patch)),
      found.handle(botJobs, ({ bot }) => service.jobs(bot)),
      found.handle(botDelete, ({ bot }) => service.remove(bot)),
      found.handle(botConversation, ({ bot, ...range }) => service.conversation(bot).page(range)),
      ctx.on(botChange, bot => found.broadcast(botChangeWire, bot)),
      ctx.on(botRemove, id => found.broadcast(botRemoveWire, id)),
      ctx.on(botEntry, entry => found.broadcast(botEntryWire, entry)),
    )
  })
