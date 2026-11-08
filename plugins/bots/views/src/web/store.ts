import { botChangeWire, botCreate, botDelete, botList, botRemoveWire, botUpdate, type BotPatch, type BotSummary, type NewBot } from '@sand/bots/contract'
import { wireHello } from '@sand/devices-contract'
import { joinDisposers } from '@sand/util'
import { derive, sig } from '@vaakx-dev/vrui'
import type { BotsContext } from './context'

const byCreated = (list: BotSummary[]) => [...list].sort((a, b) => a.created - b.created)

export const botStore = (ctx: BotsContext) => {
  const loaded = sig<BotSummary[] | undefined>(undefined)
  const bots = derive(() => {
    const list = loaded.get()
    return list && byCreated(list)
  })

  const keep = (bot: BotSummary) => {
    loaded.update(list => list && [...list.filter(other => other.id !== bot.id), bot])
    return bot
  }
  const drop = (id: string) => loaded.update(list => list?.filter(other => other.id !== id))

  const load = () => ctx.wire.call(botList, {}).then(list => loaded.set(list), error => ctx.report(error))
  ctx.on(wireHello, () => void load())
  if (ctx.wire.ready()) void load()
  ctx.effect(() => joinDisposers(ctx.wire.on(botChangeWire, keep), ctx.wire.on(botRemoveWire, drop)))

  return {
    bots,
    find: (id: string) => loaded.get()?.find(bot => bot.id === id),
    create: (spec: NewBot) => ctx.wire.call(botCreate, spec).then(keep),
    update: (bot: string, patch: BotPatch) => ctx.wire.call(botUpdate, { bot, patch }).then(keep),
    remove: (bot: string) => ctx.wire.call(botDelete, { bot }).then(() => drop(bot)),
  }
}

export type BotStore = ReturnType<typeof botStore>
