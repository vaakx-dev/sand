import {
  botChangeWire,
  botCreate,
  botDelete,
  botRemoveWire,
  botUpdate,
  helloBots,
  jobCreate,
  jobDelete,
  jobUpdate,
  type BotPatch,
  type BotSummary,
  type JobPatch,
  type NewBot,
  type NewJob,
} from '@sand/bots/contract'
import { wireHello } from '@sand/devices-contract'
import { owned } from '@sand/reactive'
import { joinDisposers } from '@sand/util'
import { deviceCache, type DeviceRecords } from '@sand/web-client/contract'
import { derive, effect, sig } from '@vaakx-dev/vrui'
import type { BotsContext } from './context'

const LIST_KEY = 'list'

const byCreated = (list: BotSummary[]) => [...list].sort((a, b) => a.created - b.created)

export const botStore = (ctx: BotsContext) => {
  const loaded = sig<BotSummary[] | undefined>(undefined)
  const bots = derive(() => {
    const list = loaded.get()
    return list && byCreated(list)
  })
  const kept = sig<DeviceRecords<BotSummary[]> | undefined>(undefined)

  const keep = (bot: BotSummary) => {
    loaded.update(list => list && [...list.filter(other => other.id !== bot.id), bot])
    return bot
  }
  const drop = (id: string) => loaded.update(list => list?.filter(other => other.id !== id))

  const restore = async (records: DeviceRecords<BotSummary[]>) => {
    const list = await records.read(LIST_KEY)
    if (list && loaded.get() === undefined) loaded.set(list)
  }

  ctx.watch(deviceCache, found => {
    const records = found?.records<BotSummary[]>('bots')
    kept.set(records)
    if (records) void restore(records)
  })
  owned(ctx, () =>
    effect(() => {
      const list = loaded.get()
      if (list) kept.get()?.write(LIST_KEY, list)
    }),
  )

  const greeted = () => loaded.set(ctx.wire.hello(helloBots) ?? [])
  ctx.on(wireHello, greeted)
  if (ctx.wire.ready()) greeted()
  ctx.effect(() => joinDisposers(ctx.wire.on(botChangeWire, keep), ctx.wire.on(botRemoveWire, drop)))

  return {
    bots,
    find: (id: string) => loaded.get()?.find(bot => bot.id === id),
    create: (spec: NewBot) => ctx.wire.call(botCreate, spec).then(keep),
    update: (bot: string, patch: BotPatch) => ctx.wire.call(botUpdate, { bot, patch }).then(keep),
    remove: (bot: string) => ctx.wire.call(botDelete, { bot }).then(() => drop(bot)),
    jobs: {
      create: (bot: string, spec: Omit<NewJob, 'bot'>) => ctx.wire.call(jobCreate, { bot, ...spec }),
      update: (job: string, patch: JobPatch) => ctx.wire.call(jobUpdate, { job, patch }),
      remove: (job: string) => ctx.wire.call(jobDelete, { job }),
    },
  }
}

export type BotStore = ReturnType<typeof botStore>
