import { sessions } from '@sand/chats/contract'
import type { Caller } from '@sand/host-hub/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import {
  botChange,
  botChangeWire,
  botCreate,
  botDelete,
  botEntry,
  botEntryWire,
  botList,
  botRemove,
  botRemoveWire,
  type Bots,
  botUpdate,
  type Changer,
  helloBots,
  jobCreate,
  jobDelete,
  jobReport,
  jobUpdate,
} from './contract'

export const serveBots = (ctx: Context, service: Bots) => {
  const changerOf = ({ kind, actor }: Caller): Changer => {
    if (actor?.owner === 'bot') return { kind: 'bot', id: actor.id, label: service.get(actor.id)?.name || 'a bot' }
    if (actor) return { kind: 'thread', id: actor.id, label: ctx.get(sessions)?.open(actor.id)?.title || 'a thread' }
    return kind === 'agent' ? { kind: 'agent' } : { kind: 'user' }
  }

  const botOf = (bot: string | undefined, { actor }: Caller) => {
    const id = bot ?? (actor?.owner === 'bot' ? actor.id : undefined)
    if (!id) throw new Error('Name the bot')
    return id
  }

  return ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.hello(helloBots, () => service.list()),
      found.handle(botList, () => service.list()),
      found.handle(botCreate, spec => service.create(spec)),
      found.handle(botUpdate, ({ bot, patch }, caller) => service.update(botOf(bot, caller), patch, changerOf(caller))),
      found.handle(botDelete, ({ bot }) => service.remove(bot)),
      found.handle(jobCreate, ({ bot, ...spec }, caller) => service.jobs.create(botOf(bot, caller), spec)),
      found.handle(jobUpdate, ({ job, patch }) => service.jobs.update(job, patch)),
      found.handle(jobDelete, ({ job }) => service.jobs.remove(job)),
      found.handle(jobReport, ({ job, ...report }) => service.jobs.report(job, report)),
      ctx.on(botChange, bot => found.broadcast(botChangeWire, bot)),
      ctx.on(botRemove, id => found.broadcast(botRemoveWire, id)),
      ctx.on(botEntry, entry => found.broadcast(botEntryWire, entry)),
    )
  })
}
